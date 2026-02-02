import gradio as gr
import os
import firebase_admin
from firebase_admin import credentials, firestore
from groq import Groq
import pytesseract
from pdf2image import convert_from_path
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

# ========================
# DOCUMENT PROCESSING
# ========================

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using PyPDF2"""
    try:
        print(f"Attempting to read PDF: {pdf_path}")
        reader = PdfReader(pdf_path)
        text_by_page = {}
        
        print(f"PDF has {len(reader.pages)} pages")
        
        for page_num, page in enumerate(reader.pages, start=1):
            try:
                text = page.extract_text()
                if text and text.strip():
                    text_by_page[page_num] = text.strip()
                    print(f"Page {page_num}: Extracted {len(text)} characters")
                else:
                    print(f"Page {page_num}: No text found")
            except Exception as e:
                print(f"Error extracting page {page_num}: {e}")
                text_by_page[page_num] = f"[Error reading page {page_num}]"
        
        if not text_by_page:
            print("No text extracted from any page")
            return {1: "[No text could be extracted from PDF]"}
            
        return text_by_page
        
    except Exception as e:
        print(f"PDF reading error: {e}")
        print(traceback.format_exc())
        return {1: f"Error reading PDF: {str(e)}"}

def extract_text_from_image(image_path):
    """Extract text from image using OCR"""
    try:
        print(f"Attempting OCR on image: {image_path}")
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        print(f"OCR extracted {len(text)} characters")
        return {1: text}
    except Exception as e:
        print(f"Image OCR error: {e}")
        return {1: f"Error: {str(e)}"}

def ocr_pdf(pdf_path):
    """OCR scanned PDF using pdf2image and pytesseract"""
    try:
        print(f"Attempting OCR on PDF: {pdf_path}")
        images = convert_from_path(pdf_path, dpi=300)
        text_by_page = {}
        
        print(f"PDF converted to {len(images)} images")
        
        for page_num, image in enumerate(images, start=1):
            try:
                text = pytesseract.image_to_string(image)
                if text and text.strip():
                    text_by_page[page_num] = text.strip()
                    print(f"OCR Page {page_num}: Extracted {len(text)} characters")
            except Exception as e:
                print(f"OCR error on page {page_num}: {e}")
                text_by_page[page_num] = f"[OCR error on page {page_num}]"
        
        return text_by_page if text_by_page else {1: "[OCR failed to extract text]"}
        
    except Exception as e:
        print(f"PDF OCR error: {e}")
        print(traceback.format_exc())
        return {1: f"OCR Error: {str(e)}. PDF may need poppler-utils installed."}

def process_document(file, user_id, current_filename):
    if not user_id:
        return "❌ Please login first", None, ""
    
    if file is None:
        return "❌ No file uploaded", None, ""
    
    print(f"\n{'='*80}")
    print(f"Processing file: {file.name}")
    print(f"{'='*80}")
    
    file_ext = file.name.split('.')[-1].lower()
    filename = file.name.split('/')[-1]
    
    text_by_page = {}
    
    if file_ext == 'pdf':
        # First try PyPDF2 for text extraction
        print("Step 1: Trying PyPDF2 text extraction...")
        text_by_page = extract_text_from_pdf(file.name)
        
        # Check if extraction was successful
        total_chars = sum(len(text) for text in text_by_page.values() if not text.startswith('['))
        
        print(f"PyPDF2 extracted {total_chars} characters from {len(text_by_page)} pages")
        
        # If very little text or errors, try OCR
        if total_chars < 100 or any('[' in str(text) for text in text_by_page.values()):
            print("Step 2: Text extraction insufficient, trying OCR...")
            ocr_result = ocr_pdf(file.name)
            
            # Use OCR result if it's better
            ocr_chars = sum(len(text) for text in ocr_result.values() if not text.startswith('['))
            print(f"OCR extracted {ocr_chars} characters")
            
            if ocr_chars > total_chars:
                print("Using OCR result (better extraction)")
                text_by_page = ocr_result
                total_chars = ocr_chars
            else:
                print("Keeping PyPDF2 result")
                
    elif file_ext in ['png', 'jpg', 'jpeg']:
        print("Processing image file with OCR...")
        text_by_page = extract_text_from_image(file.name)
        total_chars = sum(len(text) for text in text_by_page.values())
    else:
        return "❌ Unsupported file format", None, ""
    
    # Final validation
    if total_chars < 50:
        error_msg = f"⚠️ Warning: Only {total_chars} characters extracted.\n"
        error_msg += "Document may be:\n"
        error_msg += "- Encrypted/password protected\n"
        error_msg += "- Scanned image without OCR\n"
        error_msg += "- Corrupted file\n"
        error_msg += f"\nExtracted content preview:\n{list(text_by_page.values())[0][:200]}"
        return error_msg, text_by_page, filename
    
    # Save to Firestore (metadata only)
    try:
        doc_ref = db.collection('documents').add({
            'user_id': user_id,
            'filename': filename,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'pages': len(text_by_page),
            'characters': total_chars
        })
        print(f"Saved metadata to Firestore")
    except Exception as e:
        print(f"Firestore save error: {e}")
    
    success_msg = f"✅ Document processed successfully!\n"
    success_msg += f"📄 File: {filename}\n"
    success_msg += f"📊 Pages: {len(text_by_page)}\n"
    success_msg += f"📝 Characters extracted: {total_chars:,}\n"
    success_msg += f"\nFirst 200 characters:\n{list(text_by_page.values())[0][:200]}..."
    
    print(f"\n{'='*80}")
    print("Processing complete!")
    print(f"{'='*80}\n")
    
    return success_msg, text_by_page, filename

def answer_question(question, text_by_page, history, user_id, current_filename):
    if not user_id:
        error_msg = {"role": "assistant", "content": "❌ Please login first"}
        return history + [error_msg], ""
    
    if not text_by_page:
        error_msg = {"role": "assistant", "content": "⚠️ Please upload and process a document first"}
        return history + [error_msg], ""
    
    if not question or not question.strip():
        error_msg = {"role": "assistant", "content": "⚠️ Please enter a question"}
        return history + [error_msg], ""
    
    # Add user question to history
    history.append({"role": "user", "content": question})
    
    # Build context with better formatting
    context_parts = []
    for page, text in text_by_page.items():
        # Skip error messages in context
        if not text.startswith('[') and not text.startswith('Error'):
            context_parts.append(f"=== PAGE {page} ===\n{text.strip()}")
    
    context = "\n\n".join(context_parts)
    
    # Check if context is too short
    if len(context) < 50:
        error_msg = {"role": "assistant", "content": "❌ Error: Document content is too short or empty. Please upload a valid document with readable text."}
        history.append(error_msg)
        return history, ""
    
    print(f"\nAnswering question: {question}")
    print(f"Context length: {len(context)} characters")
    
    prompt = f"""You are an AI assistant helping Chartered Accountants analyze documents.

DOCUMENT: {current_filename if current_filename else "Uploaded Document"}

DOCUMENT CONTENT:
{context}

USER QUESTION: {question}

INSTRUCTIONS:
1. Read the document content carefully
2. Answer ONLY based on information found in the document above
3. When you find relevant information, cite the page number using [Page X] format
4. If the information is not in the document, clearly state "The document does not contain information about [topic]"
5. Be specific and quote relevant parts of the document when answering
6. If the document is unclear, mention that and provide the best interpretation

ANSWER:"""
    
    try:
        print("Sending to Groq API...")
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2048
        )
        answer = response.choices[0].message.content
        print(f"Received answer: {len(answer)} characters")
        
        # Add assistant answer to history
        history.append({"role": "assistant", "content": answer})
        
        return history, ""
        
    except Exception as e:
        print(f"Groq API error: {e}")
        error_msg = {"role": "assistant", "content": f"❌ Error communicating with AI: {str(e)}\n\nPlease try again or contact support."}
        history.append(error_msg)
        return history, ""

# ========================
# CHAT HISTORY EXPORT
# ========================

def export_chat_history(history, user_id, current_filename):
    """Export chat history as a downloadable text file"""
    if not history or len(history) == 0:
        return None
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chat_history_{timestamp}.txt"
        
        content = "=" * 80 + "\n"
        content += "LEGACY LOGIC PRO - CHAT HISTORY\n"
        content += f"Session Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        if current_filename:
            content += f"Document: {current_filename}\n"
        content += "=" * 80 + "\n\n"
        
        for i, msg in enumerate(history, 1):
            role = msg.get("role", "unknown").upper()
            text = msg.get("content", "")
            
            content += f"{'-' * 80}\n"
            content += f"{role} (Message {i}):\n"
            content += f"{'-' * 80}\n"
            content += f"{text}\n\n"
        
        content += "=" * 80 + "\n"
        content += "End of Chat History\n"
        content += "=" * 80 + "\n"
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return filename
    
    except Exception as e:
        print(f"Error exporting chat history: {e}")
        return None

def export_chat_history_json(history, user_id, current_filename):
    """Export chat history as JSON"""
    if not history or len(history) == 0:
        return None
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chat_history_{timestamp}.json"
        
        export_data = {
            "session_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "user_id": user_id if user_id else "unknown",
            "document": current_filename if current_filename else "Unknown",
            "messages": history,
            "total_messages": len(history)
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        return filename
    
    except Exception as e:
        print(f"Error exporting chat history JSON: {e}")
        return None

# ========================
# AUTHENTICATION
# ========================

def login_user(email, password):
    """Authenticate user"""
    if not email or not email.strip():
        return "❌ Please enter an email", None, gr.update(visible=True), gr.update(visible=False)
    
    if not password or not password.strip():
        return "❌ Please enter a password", None, gr.update(visible=True), gr.update(visible=False)
    
    try:
        users_ref = db.collection('users')
        query = users_ref.where(filter=FieldFilter('email', '==', email.strip().lower())).limit(1).get()
        
        if not query or len(query) == 0:
            return "❌ No account found with this email", None, gr.update(visible=True), gr.update(visible=False)
        
        user_doc = query[0]
        user_data = user_doc.to_dict()
        
        stored_password = user_data.get('password', '')
        if stored_password == password:
            user_id = user_doc.id
            user_name = user_data.get('name', 'User')
            return f"✅ Welcome back, {user_name}!", user_id, gr.update(visible=False), gr.update(visible=True)
        else:
            return "❌ Incorrect password", None, gr.update(visible=True), gr.update(visible=False)
            
    except Exception as e:
        print(f"Login error: {e}")
        return f"❌ Login error: {str(e)}", None, gr.update(visible=True), gr.update(visible=False)

def logout_user():
    """Logout user"""
    return None, None, [], "", "", gr.update(visible=True), gr.update(visible=False), "Logged out"

# ========================
# MAIN UI
# ========================

custom_css = """
.login-container {
    max-width: 500px;
    margin: 100px auto;
    padding: 40px;
}
.brand-title {
    font-size: 48px !important;
    font-weight: bold !important;
    text-align: center;
    margin-bottom: 10px;
}
.brand-subtitle {
    font-size: 18px;
    text-align: center;
    margin-bottom: 40px;
    color: #888;
}
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
        email_input = gr.Textbox(label="📧 Email", placeholder="Enter your email", lines=1)
        password_input = gr.Textbox(label="🔒 Password", type="password", placeholder="Enter your password", lines=1)
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
                gr.Markdown("Upload PDF or image files. System extracts text and tracks page numbers for accurate citations.")
                
                file_input = gr.File(label="📁 Upload Document (PDF, PNG, JPG)", file_types=[".pdf", ".png", ".jpg", ".jpeg"])
                process_btn = gr.Button("🔄 Process Document", variant="primary", size="lg")
                process_output = gr.Textbox(label="Status", lines=8)
            
            with gr.Tab("💬 Ask Questions"):
                gr.Markdown("## Ask Questions About Your Documents")
                gr.Markdown("Get AI-powered answers with page-level citations from your processed documents.")
                
                question_input = gr.Textbox(label="Your Question", placeholder="Ask anything about the uploaded document...", lines=2)
                ask_btn = gr.Button("📤 Ask Question", variant="primary", size="lg")
                
                chatbot = gr.Chatbot(label="Conversation", height=500)
                
                gr.Markdown("---")
                gr.Markdown("### 💾 Export Current Session")
                with gr.Row():
                    export_txt_btn = gr.Button("📄 Download as Text", size="sm", variant="secondary")
                    export_json_btn = gr.Button("📋 Download as JSON", size="sm", variant="secondary")
                
                export_file = gr.File(label="Download File", visible=True)
            
            with gr.Tab("👤 Account"):
                gr.Markdown("## Account Information")
                gr.Markdown("**Status:** Active")
                gr.Markdown("---")
                gr.Markdown("### 🔒 Privacy & Data")
                gr.Markdown("- ✅ No document content stored in database")
                gr.Markdown("- ✅ All chat history cleared on logout")
                gr.Markdown("- ✅ Session data only (temporary)")
                gr.Markdown("- ✅ Only document counts tracked for analytics")
        
        gr.Markdown("---")
        with gr.Row():
            with gr.Column(scale=2):
                pass
            with gr.Column(scale=1):
                logout_btn = gr.Button("🚪 Logout", variant="secondary", size="lg")
            with gr.Column(scale=2):
                pass
    
    login_btn.click(fn=login_user, inputs=[email_input, password_input], outputs=[login_status, user_id_state, login_screen, dashboard])
    process_btn.click(fn=process_document, inputs=[file_input, user_id_state, current_filename_state], outputs=[process_output, text_by_page_state, current_filename_state])
    ask_btn.click(fn=answer_question, inputs=[question_input, text_by_page_state, chatbot, user_id_state, current_filename_state], outputs=[chatbot, question_input])
    export_txt_btn.click(fn=export_chat_history, inputs=[chatbot, user_id_state, current_filename_state], outputs=[export_file])
    export_json_btn.click(fn=export_chat_history_json, inputs=[chatbot, user_id_state, current_filename_state], outputs=[export_file])
    logout_btn.click(fn=logout_user, outputs=[user_id_state, text_by_page_state, current_filename_state, chatbot, question_input, login_screen, dashboard, login_status])

if __name__ == "__main__":
    app.launch(
        theme=gr.themes.Soft(),
        css=custom_css,
        server_name="0.0.0.0",
        server_port=int(os.environ.get("PORT", 10000)),
        share=False
    )
