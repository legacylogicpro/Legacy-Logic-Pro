import gradio as gr
import os
import firebase_admin
from firebase_admin import credentials, firestore
from groq import Groq
from PyPDF2 import PdfReader
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime
import json
import traceback
from pdf2image import convert_from_path
from PIL import Image
import io
import base64

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate({
        "type": os.environ.get("FIREBASE_TYPE"),
        "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
        "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": os.environ.get("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
        "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.environ.get("FIREBASE_CLIENT_ID"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": os.environ.get("FIREBASE_CERT_URL")
    })
    firebase_admin.initialize_app(cred)

db = firestore.client()
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Google Cloud Vision API Key
GOOGLE_VISION_API_KEY = os.environ.get("GOOGLE_CLOUD_VISION_API_KEY")

# ========================
# DOCUMENT PROCESSING
# ========================

def extract_text_from_pdf_fast(pdf_path):
    """Fast text extraction using PyPDF2"""
    try:
        print(f"\n{'='*60}")
        print(f"📄 Extracting text: {pdf_path.split('/')[-1]}")
        print(f"{'='*60}")
        
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        text_by_page = {}
        
        for page_num, page in enumerate(reader.pages, start=1):
            try:
                text = page.extract_text()
                if text and len(text.strip()) > 20:
                    text_by_page[page_num] = text.strip()
                    print(f"  ✓ Page {page_num}/{total_pages}: {len(text):,} chars")
                else:
                    print(f"  ✗ Page {page_num}/{total_pages}: No text")
            except Exception as e:
                print(f"  ✗ Page {page_num}/{total_pages}: {e}")
        
        total_chars = sum(len(text) for text in text_by_page.values())
        print(f"Total: {total_chars:,} characters from {len(text_by_page)} pages")
        print(f"{'='*60}\n")
        
        return text_by_page if total_chars > 100 else None
        
    except Exception as e:
        print(f"PDF Error: {e}")
        return None

def ocr_image_with_google_vision(image):
    """OCR single image using Google Cloud Vision API"""
    try:
        import requests
        
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        image_base64 = base64.b64encode(img_byte_arr).decode('utf-8')
        
        url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_API_KEY}"
        
        payload = {
            "requests": [{
                "image": {"content": image_base64},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]
            }]
        }
        
        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if 'responses' in result and len(result['responses']) > 0:
                if 'fullTextAnnotation' in result['responses'][0]:
                    return result['responses'][0]['fullTextAnnotation']['text']
        
        return ""
        
    except Exception as e:
        print(f"Google Vision OCR Error: {e}")
        return ""

def ocr_pdf_with_cloud(pdf_path):
    """OCR entire PDF using Google Cloud Vision"""
    try:
        print(f"\n{'='*60}")
        print(f"🔍 OCR Processing (Cloud): {pdf_path.split('/')[-1]}")
        print(f"{'='*60}")
        
        images = convert_from_path(pdf_path, dpi=200)
        total_pages = len(images)
        text_by_page = {}
        
        print(f"Converting {total_pages} pages to text...")
        
        for page_num, image in enumerate(images, start=1):
            try:
                print(f"  Processing page {page_num}/{total_pages}...")
                text = ocr_image_with_google_vision(image)
                
                if text and text.strip():
                    text_by_page[page_num] = text.strip()
                    print(f"  ✓ Page {page_num}/{total_pages}: {len(text):,} chars")
                else:
                    print(f"  ✗ Page {page_num}/{total_pages}: No text")
                    
            except Exception as e:
                print(f"  ✗ Page {page_num}/{total_pages}: {e}")
        
        total_chars = sum(len(text) for text in text_by_page.values())
        print(f"OCR Complete: {total_chars:,} characters from {len(text_by_page)} pages")
        print(f"{'='*60}\n")
        
        return text_by_page if text_by_page else None
        
    except Exception as e:
        print(f"OCR Error: {e}")
        print(traceback.format_exc())
        return None

def process_document(file, user_id, current_filename):
    """Process document with smart text extraction + cloud OCR fallback"""
    
    if not user_id:
        return "❌ Please login first", None, ""
    
    if file is None:
        return "❌ No file uploaded", None, ""
    
    file_ext = file.name.split('.')[-1].lower()
    filename = file.name.split('/')[-1]
    
    if file_ext != 'pdf':
        return "❌ Only PDF files are supported", None, ""
    
    print("⏳ Step 1/2: Extracting text from PDF...")
    
    text_by_page = extract_text_from_pdf_fast(file.name)
    extraction_method = "Text Extraction"
    
    if not text_by_page:
        if not GOOGLE_VISION_API_KEY:
            error_msg = "⚠️ **No readable text found**\n\n"
            error_msg += "This PDF appears to be scanned/image-based.\n"
            error_msg += "OCR is not configured (missing API key).\n\n"
            error_msg += "Please upload a PDF with selectable text."
            return error_msg, None, ""
        
        print("⏳ Step 2/2: Running Cloud OCR (this may take 30-60 seconds)...")
        
        text_by_page = ocr_pdf_with_cloud(file.name)
        extraction_method = "Cloud OCR (Google Vision)"
        
        if not text_by_page:
            error_msg = "❌ **OCR Failed**\n\n"
            error_msg += "Could not extract text using OCR.\n"
            error_msg += "The PDF may be corrupted or encrypted."
            return error_msg, None, ""
    
    total_chars = sum(len(text) for text in text_by_page.values())
    
    if total_chars < 100:
        error_msg = f"⚠️ **Insufficient text: {total_chars} characters**\n"
        error_msg += "Document may be empty or corrupted."
        return error_msg, None, ""
    
    try:
        db.collection('documents').add({
            'user_id': user_id,
            'filename': filename,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'pages': len(text_by_page),
            'characters': total_chars,
            'method': extraction_method
        })
    except Exception as e:
        print(f"Firestore error: {e}")
    
    success_msg = f"✅ **Document Processed Successfully!**\n\n"
    success_msg += f"📄 **File:** {filename}\n"
    success_msg += f"📊 **Pages:** {len(text_by_page)}\n"
    success_msg += f"📝 **Characters:** {total_chars:,}\n"
    success_msg += f"🔧 **Method:** {extraction_method}\n\n"
    
    first_page_text = list(text_by_page.values())[0]
    success_msg += f"**Preview:**\n```\n{first_page_text[:300]}...\n```\n\n"
    success_msg += f"✓ Ready to answer questions!"
    
    return success_msg, text_by_page, filename

def answer_question(question, text_by_page, history, user_id, current_filename):
    """Answer questions using Groq AI"""
    
    if not user_id:
        return history + [{"role": "assistant", "content": "❌ Please login first"}], ""
    
    if not text_by_page:
        return history + [{"role": "assistant", "content": "⚠️ Please upload and process a document first"}], ""
    
    if not question or not question.strip():
        return history + [{"role": "assistant", "content": "⚠️ Please enter a question"}], ""
    
    history.append({"role": "user", "content": question})
    
    context_parts = []
    for page, text in text_by_page.items():
        context_parts.append(f"=== PAGE {page} ===\n{text.strip()}")
    
    context = "\n\n".join(context_parts)
    
    print(f"\n{'='*60}")
    print(f"❓ Question: {question[:100]}...")
    print(f"📊 Context: {len(context):,} characters")
    print(f"{'='*60}")
    
    prompt = f"""You are an AI assistant helping Chartered Accountants analyze documents.

DOCUMENT: {current_filename}

FULL DOCUMENT CONTENT:
{context}

USER QUESTION: {question}

INSTRUCTIONS:
1. Read the document carefully
2. Answer using ONLY information from the document
3. Cite page numbers as [Page X]
4. Quote relevant text when answering
5. If information not found, state: "The document does not contain information about [topic]"

ANSWER:"""
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048
        )
        answer = response.choices[0].message.content
        print(f"✅ Answer: {len(answer)} chars\n")
        
        history.append({"role": "assistant", "content": answer})
        return history, ""
        
    except Exception as e:
        print(f"❌ Groq Error: {e}\n")
        history.append({"role": "assistant", "content": f"❌ Error: {str(e)}"})
        return history, ""

# ========================
# CHAT EXPORT
# ========================

def export_chat_history(history, user_id, current_filename):
    if not history:
        return None
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chat_history_{timestamp}.txt"
        
        content = "=" * 80 + "\n"
        content += "LEGACY LOGIC PRO - CHAT HISTORY\n"
        content += f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        if current_filename:
            content += f"Document: {current_filename}\n"
        content += "=" * 80 + "\n\n"
        
        for i, msg in enumerate(history, 1):
            role = msg.get("role", "unknown").upper()
            text = msg.get("content", "")
            content += f"{'-' * 80}\n{role} (Message {i}):\n{'-' * 80}\n{text}\n\n"
        
        content += "=" * 80 + "\n"
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return filename
    except:
        return None

def export_chat_history_json(history, user_id, current_filename):
    if not history:
        return None
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chat_history_{timestamp}.json"
        
        data = {
            "date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "document": current_filename or "Unknown",
            "messages": history
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return filename
    except:
        return None

# ========================
# AUTH
# ========================

def login_user(email, password):
    if not email or not email.strip():
        return "❌ Please enter an email", None, gr.update(visible=True), gr.update(visible=False)
    
    if not password or not password.strip():
        return "❌ Please enter a password", None, gr.update(visible=True), gr.update(visible=False)
    
    try:
        users_ref = db.collection('users')
        query = users_ref.where(filter=FieldFilter('email', '==', email.strip().lower())).limit(1).get()
        
        if not query:
            return "❌ No account found", None, gr.update(visible=True), gr.update(visible=False)
        
        user_doc = query[0]
        user_data = user_doc.to_dict()
        
        if user_data.get('password', '') == password:
            user_id = user_doc.id
            user_name = user_data.get('name', 'User')
            return f"✅ Welcome back, {user_name}!", user_id, gr.update(visible=False), gr.update(visible=True)
        else:
            return "❌ Incorrect password", None, gr.update(visible=True), gr.update(visible=False)
            
    except Exception as e:
        return f"❌ Error: {str(e)}", None, gr.update(visible=True), gr.update(visible=False)

def logout_user():
    return None, None, [], "", "", gr.update(visible=True), gr.update(visible=False), "Logged out"

# ========================
# UI
# ========================

custom_css = """
.login-container {
    max-width: 500px; 
    margin: 50px auto; 
    padding: 40px;
}
.logo-container {
    text-align: center;
    margin-bottom: 30px;
}
.brand-title {
    font-size: 38px !important; 
    font-weight: bold !important; 
    text-align: center; 
    margin-bottom: 10px;
}
.brand-subtitle {
    font-size: 15px; 
    text-align: center; 
    margin-bottom: 30px; 
    color: #888;
}
"""

# Gradio 6.0 compatible
with gr.Blocks(title="Legacy Logic Pro") as app:
    
    user_id_state = gr.State(None)
    text_by_page_state = gr.State(None)
    current_filename_state = gr.State("")
    
    # ============ LOGIN SCREEN ============
    with gr.Column(visible=True, elem_classes="login-container") as login_screen:
        # Logo - Use your actual logo if file exists, otherwise emoji
        if os.path.exists("logo.png"):
            gr.Image("logo.png", height=120, width=120, show_label=False, show_download_button=False, container=False, elem_classes="logo-container")
        else:
            gr.Markdown('<div class="logo-container"><div style="font-size: 80px;">🚀</div></div>')
        
        gr.Markdown("# 🚀 Legacy Logic Pro", elem_classes="brand-title")
        gr.Markdown("AI-Powered Document Processing for Chartered Accountants", elem_classes="brand-subtitle")
        gr.Markdown("---")
        
        gr.Markdown("### 🔐 Login to Continue")
        email_input = gr.Textbox(label="📧 Email", placeholder="Enter your email")
        password_input = gr.Textbox(label="🔒 Password", type="password", placeholder="Enter your password")
        login_btn = gr.Button("🔓 Login", variant="primary", size="lg")
        login_status = gr.Textbox(label="", interactive=False, show_label=False, container=False)
        gr.Markdown("---")
        gr.Markdown("*Contact admin to create an account*")
    
    # ============ DASHBOARD ============
    with gr.Column(visible=False) as dashboard:
        # Dashboard logo
        if os.path.exists("logo.png"):
            gr.Image("logo.png", height=70, width=70, show_label=False, show_download_button=False, container=False)
        else:
            gr.Markdown('<div style="text-align: center; font-size: 50px; margin-bottom: 10px;">🚀</div>')
        
        gr.Markdown("# 🚀 **Legacy Logic Pro**")
        gr.Markdown("### AI-Powered Document Processing for Chartered Accountants")
        gr.Markdown("**With Page-Level Citations** | Built by Tarun")
        gr.Markdown("---")
        
        with gr.Tabs():
            with gr.Tab("📄 Process Documents"):
                gr.Markdown("## Upload and Process Documents")
                gr.Markdown("⚡ **Smart Processing:** Fast text extraction + Cloud OCR fallback")
                gr.Markdown("📝 **Supports:** Text PDFs (~5-10 sec) & Scanned PDFs (~30-60 sec)")
                
                file_input = gr.File(label="📁 Upload PDF Document", file_types=[".pdf"])
                process_btn = gr.Button("🔄 Process Document", variant="primary", size="lg")
                process_output = gr.Textbox(label="Status", lines=10)
            
            with gr.Tab("💬 Ask Questions"):
                gr.Markdown("## Ask Questions About Your Documents")
                
                question_input = gr.Textbox(label="Your Question", placeholder="Ask anything...", lines=2)
                ask_btn = gr.Button("📤 Ask Question", variant="primary", size="lg")
                chatbot = gr.Chatbot(label="Conversation", height=500)
                
                gr.Markdown("---")
                gr.Markdown("### 💾 Export Session")
                with gr.Row():
                    export_txt_btn = gr.Button("📄 Text", size="sm", variant="secondary")
                    export_json_btn = gr.Button("📋 JSON", size="sm", variant="secondary")
                export_file = gr.File(label="Download")
            
            with gr.Tab("👤 Account"):
                gr.Markdown("## Account Information")
                gr.Markdown("**Status:** Active")
                gr.Markdown("---")
                gr.Markdown("### 🔒 Privacy")
                gr.Markdown("- No content stored\n- Session-only\n- Cleared on logout")
                gr.Markdown("---")
                gr.Markdown("### ⚡ Performance")
                gr.Markdown("- Text PDFs: ~5-10 sec\n- Scanned PDFs: ~30-60 sec\n- Google Cloud Vision OCR")
        
        gr.Markdown("---")
        with gr.Row():
            gr.Column(scale=2)
            logout_btn = gr.Button("🚪 Logout", variant="secondary", size="lg", scale=1)
            gr.Column(scale=2)
    
    # Event handlers
    login_btn.click(login_user, [email_input, password_input], [login_status, user_id_state, login_screen, dashboard])
    process_btn.click(process_document, [file_input, user_id_state, current_filename_state], [process_output, text_by_page_state, current_filename_state])
    ask_btn.click(answer_question, [question_input, text_by_page_state, chatbot, user_id_state, current_filename_state], [chatbot, question_input])
    export_txt_btn.click(export_chat_history, [chatbot, user_id_state, current_filename_state], [export_file])
    export_json_btn.click(export_chat_history_json, [chatbot, user_id_state, current_filename_state], [export_file])
    logout_btn.click(logout_user, None, [user_id_state, text_by_page_state, current_filename_state, chatbot, question_input, login_screen, dashboard, login_status])

if __name__ == "__main__":
    app.launch(
        css=custom_css,  # Fixed for Gradio 6.0
        server_name="0.0.0.0",
        server_port=int(os.environ.get("PORT", 10000)),
        share=False
    )
