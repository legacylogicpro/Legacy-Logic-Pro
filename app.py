import gradio as gr
import os
import firebase_admin
from firebase_admin import credentials, firestore
from groq import Groq
from PyPDF2 import PdfReader
from PIL import Image
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime
import json
import traceback

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

# Initialize Groq
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Check if OCR dependencies are available
OCR_AVAILABLE = False
try:
    import pytesseract
    from pdf2image import convert_from_path
    OCR_AVAILABLE = True
    print("✅ OCR dependencies available")
except ImportError as e:
    print(f"⚠️ OCR not available: {e}")

# ========================
# DOCUMENT PROCESSING
# ========================

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using PyPDF2"""
    try:
        print(f"\n{'='*80}")
        print(f"Reading PDF: {pdf_path}")
        print(f"{'='*80}")
        
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        text_by_page = {}
        
        print(f"PDF has {total_pages} pages")
        
        for page_num, page in enumerate(reader.pages, start=1):
            try:
                text = page.extract_text()
                if text and text.strip():
                    text_by_page[page_num] = text.strip()
                    char_count = len(text.strip())
                    print(f"✓ Page {page_num}/{total_pages}: {char_count} characters")
                else:
                    print(f"✗ Page {page_num}/{total_pages}: No text (may be scanned image)")
            except Exception as e:
                print(f"✗ Page {page_num}/{total_pages}: Error - {e}")
        
        total_chars = sum(len(text) for text in text_by_page.values())
        print(f"\nTotal: {len(text_by_page)} pages, {total_chars:,} characters")
        print(f"{'='*80}\n")
        
        return text_by_page if text_by_page else {1: "[No readable text found in PDF]"}
        
    except Exception as e:
        print(f"PDF Error: {e}")
        print(traceback.format_exc())
        return {1: f"Error reading PDF: {str(e)}"}

def extract_text_with_ocr(pdf_path):
    """Try OCR extraction if available"""
    if not OCR_AVAILABLE:
        return None
    
    try:
        print(f"\n{'='*80}")
        print(f"Attempting OCR on PDF...")
        print(f"{'='*80}")
        
        images = convert_from_path(pdf_path, dpi=200)
        text_by_page = {}
        
        for page_num, image in enumerate(images, start=1):
            try:
                text = pytesseract.image_to_string(image)
                if text and text.strip():
                    text_by_page[page_num] = text.strip()
                    print(f"✓ OCR Page {page_num}: {len(text)} characters")
            except Exception as e:
                print(f"✗ OCR Page {page_num}: {e}")
        
        total_chars = sum(len(text) for text in text_by_page.values())
        print(f"\nOCR Total: {len(text_by_page)} pages, {total_chars:,} characters")
        print(f"{'='*80}\n")
        
        return text_by_page if text_by_page else None
        
    except Exception as e:
        print(f"OCR Error: {e}")
        return None

def process_document(file, user_id, current_filename):
    if not user_id:
        return "❌ Please login first", None, ""
    
    if file is None:
        return "❌ No file uploaded", None, ""
    
    file_ext = file.name.split('.')[-1].lower()
    filename = file.name.split('/')[-1]
    
    if file_ext != 'pdf':
        return "❌ Only PDF files are currently supported", None, ""
    
    # Try standard text extraction first
    text_by_page = extract_text_from_pdf(file.name)
    total_chars = sum(len(text) for text in text_by_page.values() if not text.startswith('['))
    
    extraction_method = "Text Extraction"
    
    # If very little text found, try OCR
    if total_chars < 500 and OCR_AVAILABLE:
        print("Low text count, attempting OCR...")
        ocr_result = extract_text_with_ocr(file.name)
        if ocr_result:
            ocr_chars = sum(len(text) for text in ocr_result.values())
            if ocr_chars > total_chars:
                text_by_page = ocr_result
                total_chars = ocr_chars
                extraction_method = "OCR"
    
    # Check if extraction failed
    if total_chars < 100:
        error_msg = f"⚠️ **Extraction Issue Detected**\n\n"
        error_msg += f"Only {total_chars} characters extracted from PDF.\n\n"
        error_msg += f"**Possible causes:**\n"
        error_msg += f"- PDF is scanned image (needs OCR)\n"
        error_msg += f"- PDF is encrypted/protected\n"
        error_msg += f"- PDF is corrupted\n"
        if not OCR_AVAILABLE:
            error_msg += f"- OCR not available on server\n\n"
            error_msg += f"**Note:** This PDF may require OCR processing which is currently unavailable.\n"
        error_msg += f"\n**Preview of extracted content:**\n"
        error_msg += f"```\n{list(text_by_page.values())[:300]}\n```"
        return error_msg, None, ""
    
    # Save metadata to Firestore
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
    
    # Create success message with preview
    success_msg = f"✅ **Document Processed Successfully!**\n\n"
    success_msg += f"📄 **File:** {filename}\n"
    success_msg += f"📊 **Pages:** {len(text_by_page)}\n"
    success_msg += f"📝 **Characters:** {total_chars:,}\n"
    success_msg += f"🔧 **Method:** {extraction_method}\n\n"
    success_msg += f"**Preview (first 300 chars):**\n"
    success_msg += f"```\n{list(text_by_page.values())[:300]}...\n```\n\n"
    success_msg += f"✓ Ready to answer questions!"
    
    return success_msg, text_by_page, filename

def answer_question(question, text_by_page, history, user_id, current_filename):
    if not user_id:
        return history + [{"role": "assistant", "content": "❌ Please login first"}], ""
    
    if not text_by_page:
        return history + [{"role": "assistant", "content": "⚠️ Please upload and process a document first"}], ""
    
    if not question or not question.strip():
        return history + [{"role": "assistant", "content": "⚠️ Please enter a question"}], ""
    
    # Add user question
    history.append({"role": "user", "content": question})
    
    # Build context
    context_parts = []
    for page, text in text_by_page.items():
        if not text.startswith('[') and not text.startswith('Error'):
            context_parts.append(f"=== PAGE {page} ===\n{text.strip()}")
    
    context = "\n\n".join(context_parts)
    
    if len(context) < 100:
        return history + [{"role": "assistant", "content": "❌ Document content too short. Please upload a valid document."}], ""
    
    print(f"\n{'='*80}")
    print(f"Question: {question}")
    print(f"Context: {len(context)} chars")
    print(f"{'='*80}")
    
    prompt = f"""You are an AI assistant helping Chartered Accountants analyze documents.

DOCUMENT: {current_filename}

FULL DOCUMENT CONTENT:
{context}

USER QUESTION: {question}

INSTRUCTIONS:
1. Carefully read ALL the document content above
2. Answer ONLY using information from the document
3. Cite page numbers using [Page X] format
4. Quote specific text from the document
5. If info not found, say "The document does not contain information about [topic]"

ANSWER:"""
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048
        )
        answer = response.choices[0].message.content
        print(f"Answer: {len(answer)} chars\n")
        
        history.append({"role": "assistant", "content": answer})
        return history, ""
        
    except Exception as e:
        print(f"AI Error: {e}")
        return history + [{"role": "assistant", "content": f"❌ AI Error: {str(e)}"}], ""

# ========================
# CHAT HISTORY EXPORT
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
# AUTHENTICATION
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
.login-container {max-width: 500px; margin: 100px auto; padding: 40px;}
.brand-title {font-size: 48px !important; font-weight: bold !important; text-align: center; margin-bottom: 10px;}
.brand-subtitle {font-size: 18px; text-align: center; margin-bottom: 40px; color: #888;}
"""

with gr.Blocks(title="Legacy Logic Pro") as app:
    
    user_id_state = gr.State(None)
    text_by_page_state = gr.State(None)
    current_filename_state = gr.State("")
    
    with gr.Column(visible=True, elem_classes="login-container") as login_screen:
        gr.Markdown("# **Legacy Logic Pro**", elem_classes="brand-title")
        gr.Markdown("AI-Powered Document Processing for Chartered Accountants", elem_classes="brand-subtitle")
        gr.Markdown("---")
        gr.Markdown("### 🔐 Login to Continue")
        email_input = gr.Textbox(label="📧 Email", placeholder="Enter your email")
        password_input = gr.Textbox(label="🔒 Password", type="password", placeholder="Enter your password")
        login_btn = gr.Button("🔓 Login", variant="primary", size="lg")
        login_status = gr.Textbox(label="", interactive=False, show_label=False, container=False)
        gr.Markdown("---")
        gr.Markdown("*Contact admin to create an account*")
    
    with gr.Column(visible=False) as dashboard:
        gr.Markdown("# 🚀 **Legacy Logic Pro**")
        gr.Markdown("### AI-Powered Document Processing for Chartered Accountants")
        gr.Markdown("**With Page-Level Citations** | Built with ❤️ by Tarun in Mumbai")
        gr.Markdown("---")
        
        with gr.Tabs():
            with gr.Tab("📄 Process Documents"):
                gr.Markdown("## Upload and Process Documents")
                file_input = gr.File(label="📁 Upload PDF Document", file_types=[".pdf"])
                process_btn = gr.Button("🔄 Process Document", variant="primary", size="lg")
                process_output = gr.Textbox(label="Status", lines=12)
            
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
                gr.Markdown("- No document content stored\n- Session-only data\n- Clear on logout")
        
        gr.Markdown("---")
        with gr.Row():
            gr.Column(scale=2)
            logout_btn = gr.Button("🚪 Logout", variant="secondary", size="lg", scale=1)
            gr.Column(scale=2)
    
    login_btn.click(login_user, [email_input, password_input], [login_status, user_id_state, login_screen, dashboard])
    process_btn.click(process_document, [file_input, user_id_state, current_filename_state], [process_output, text_by_page_state, current_filename_state])
    ask_btn.click(answer_question, [question_input, text_by_page_state, chatbot, user_id_state, current_filename_state], [chatbot, question_input])
    export_txt_btn.click(export_chat_history, [chatbot, user_id_state, current_filename_state], [export_file])
    export_json_btn.click(export_chat_history_json, [chatbot, user_id_state, current_filename_state], [export_file])
    logout_btn.click(logout_user, None, [user_id_state, text_by_page_state, current_filename_state, chatbot, question_input, login_screen, dashboard, login_status])

if __name__ == "__main__":
    app.launch(
        theme=gr.themes.Soft(),
        css=custom_css,
        server_name="0.0.0.0",
        server_port=int(os.environ.get("PORT", 10000)),
        share=False
    )
