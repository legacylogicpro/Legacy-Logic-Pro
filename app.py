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
    try:
        reader = PdfReader(pdf_path)
        text_by_page = {}
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text()
            if text.strip():
                text_by_page[page_num] = text
        return text_by_page
    except Exception as e:
        return {1: f"Error: {str(e)}"}

def extract_text_from_image(image_path):
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return {1: text}
    except Exception as e:
        return {1: f"Error: {str(e)}"}

def ocr_pdf(pdf_path):
    try:
        images = convert_from_path(pdf_path)
        text_by_page = {}
        for page_num, image in enumerate(images, start=1):
            text = pytesseract.image_to_string(image)
            text_by_page[page_num] = text
        return text_by_page
    except Exception as e:
        return {1: f"Error: {str(e)}"}

def process_document(file, user_id, current_filename):
    if not user_id:
        return "❌ Please login first", None, ""
    
    if file is None:
        return "❌ No file uploaded", None, ""
    
    file_ext = file.name.split('.')[-1].lower()
    filename = file.name.split('/')[-1]
    
    if file_ext == 'pdf':
        text_by_page = extract_text_from_pdf(file.name)
        if not any(text_by_page.values()) or all(len(t.strip()) < 50 for t in text_by_page.values()):
            text_by_page = ocr_pdf(file.name)
    elif file_ext in ['png', 'jpg', 'jpeg']:
        text_by_page = extract_text_from_image(file.name)
    else:
        return "❌ Unsupported file format", None, ""
    
    # Check if text was extracted
    total_chars = sum(len(text) for text in text_by_page.values())
    if total_chars < 10:
        return "⚠️ Warning: Very little text extracted. Document may be image-based or encrypted.", text_by_page, filename
    
    # Save to Firestore (metadata only)
    try:
        doc_ref = db.collection('documents').add({
            'user_id': user_id,
            'filename': filename,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'pages': len(text_by_page)
        })
    except Exception as e:
        print(f"Error saving to Firestore: {e}")
    
    return f"✅ Document processed successfully!\n📄 File: {filename}\n📊 Pages: {len(text_by_page)}\n📝 Characters extracted: {total_chars:,}", text_by_page, filename

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
        context_parts.append(f"=== PAGE {page} ===\n{text.strip()}")
    
    context = "\n\n".join(context_parts)
    
    # Check if context is too short
    if len(context) < 50:
        error_msg = {"role": "assistant", "content": "❌ Error: Document content is too short or empty. Please upload a valid document with readable text."}
        history.append(error_msg)
        return history, ""
    
    prompt = f"""You are an AI assistant helping Chartered Accountants analyze tax documents.

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
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2048
        )
        answer = response.choices[0].message.content
        
        # Add assistant answer to history
        history.append({"role": "assistant", "content": answer})
        
        return history, ""
        
    except Exception as e:
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
        # Generate timestamp for filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chat_history_{timestamp}.txt"
        
        # Create formatted text content
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
        
        # Write to temporary file
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return filename
    
    except Exception as e:
        print(f"Error exporting chat history: {e}")
        return None

def export_chat_history_json(history, user_id, current_filename):
    """Export chat history as JSON (alternative format)"""
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
    """Authenticate user with better error handling"""
    
    # Input validation
    if not email or not email.strip():
        return "❌ Please enter an email", None, gr.update(visible=True), gr.update(visible=False)
    
    if not password or not password.strip():
        return "❌ Please enter a password", None, gr.update(visible=True), gr.update(visible=False)
    
    try:
        # Query Firestore for user using new filter syntax
        users_ref = db.collection('users')
        query = users_ref.where(filter=FieldFilter('email', '==', email.strip().lower())).limit(1).get()
        
        # Check if user exists
        if not query or len(query) == 0:
            return "❌ No account found with this email", None, gr.update(visible=True), gr.update(visible=False)
        
        # Get user data
        user_doc = query[0]
        user_data = user_doc.to_dict()
        
        # Verify password
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

# Custom CSS for better styling
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
.logout-btn-container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
}
"""

with gr.Blocks(title="Legacy Logic Pro") as app:
    
    # Session state
    user_id_state = gr.State(None)
    text_by_page_state = gr.State(None)
    current_filename_state = gr.State("")
    
    # ============ LOGIN SCREEN ============
    with gr.Column(visible=True, elem_classes="login-container") as login_screen:
        gr.Markdown("# **Legacy Logic Pro**", elem_classes="brand-title")
        gr.Markdown("AI-Powered Document Processing for Chartered Accountants", elem_classes="brand-subtitle")
        gr.Markdown("---")
        
        gr.Markdown("### 🔐 Login to Continue")
        email_input = gr.Textbox(
            label="📧 Email", 
            placeholder="Enter your email",
            lines=1
        )
        password_input = gr.Textbox(
            label="🔒 Password", 
            type="password", 
            placeholder="Enter your password",
            lines=1
        )
        login_btn = gr.Button("🔓 Login", variant="primary", size="lg")
        login_status = gr.Textbox(
            label="", 
            interactive=False, 
            show_label=False,
            container=False
        )
        gr.Markdown("---")
        gr.Markdown("*Contact admin to create an account*", elem_classes="text-center")
    
    # ============ DASHBOARD (Hidden initially) ============
    with gr.Column(visible=False) as dashboard:
        # Header
        gr.Markdown("# 🚀 **Legacy Logic Pro**")
        gr.Markdown("### AI-Powered Document Processing for Chartered Accountants")
        gr.Markdown("**With Page-Level Citations** | Built with ❤️ by Tarun in Mumbai")
        gr.Markdown("---")
        
        # Tabs
        with gr.Tabs():
            # Process Documents
            with gr.Tab("📄 Process Documents"):
                gr.Markdown("## Upload and Process Documents")
                gr.Markdown("Upload PDF or image files. System extracts text and tracks page numbers for accurate citations.")
                
                file_input = gr.File(
                    label="📁 Upload Document (PDF, PNG, JPG)", 
                    file_types=[".pdf", ".png", ".jpg", ".jpeg"]
                )
                process_btn = gr.Button("🔄 Process Document", variant="primary", size="lg")
                process_output = gr.Textbox(label="Status", lines=4)
            
            # Ask Questions
            with gr.Tab("💬 Ask Questions"):
                gr.Markdown("## Ask Questions About Your Documents")
                gr.Markdown("Get AI-powered answers with page-level citations from your processed documents.")
                
                question_input = gr.Textbox(
                    label="Your Question", 
                    placeholder="Ask anything about the uploaded document...",
                    lines=2
                )
                ask_btn = gr.Button("📤 Ask Question", variant="primary", size="lg")
                
                chatbot = gr.Chatbot(
                    label="Conversation", 
                    height=500
                )
                
                # Export chat history buttons
                gr.Markdown("---")
                gr.Markdown("### 💾 Export Current Session")
                with gr.Row():
                    export_txt_btn = gr.Button("📄 Download as Text", size="sm", variant="secondary")
                    export_json_btn = gr.Button("📋 Download as JSON", size="sm", variant="secondary")
                
                export_file = gr.File(label="Download File", visible=True)
            
            # Account
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
                gr.Markdown("### 💡 Tips for Best Results")
                gr.Markdown("- Upload clear, readable PDFs")
                gr.Markdown("- Avoid scanned documents with poor quality")
                gr.Markdown("- Ask specific questions about the document")
                gr.Markdown("- Reference specific sections when asking")
        
        # Logout Button at Bottom
        gr.Markdown("---")
        with gr.Row():
            with gr.Column(scale=2):
                pass
            with gr.Column(scale=1):
                logout_btn = gr.Button("🚪 Logout", variant="secondary", size="lg")
            with gr.Column(scale=2):
                pass
    
    # ========================
    # EVENT HANDLERS
    # ========================
    
    # Login
    login_btn.click(
        fn=login_user,
        inputs=[email_input, password_input],
        outputs=[login_status, user_id_state, login_screen, dashboard]
    )
    
    # Process Document
    process_btn.click(
        fn=process_document,
        inputs=[file_input, user_id_state, current_filename_state],
        outputs=[process_output, text_by_page_state, current_filename_state]
    )
    
    # Ask Question
    ask_btn.click(
        fn=answer_question,
        inputs=[question_input, text_by_page_state, chatbot, user_id_state, current_filename_state],
        outputs=[chatbot, question_input]
    )
    
    # Export chat history as text
    export_txt_btn.click(
        fn=export_chat_history,
        inputs=[chatbot, user_id_state, current_filename_state],
        outputs=[export_file]
    )
    
    # Export chat history as JSON
    export_json_btn.click(
        fn=export_chat_history_json,
        inputs=[chatbot, user_id_state, current_filename_state],
        outputs=[export_file]
    )
    
    # Logout
    logout_btn.click(
        fn=logout_user,
        outputs=[user_id_state, text_by_page_state, current_filename_state, chatbot, question_input, login_screen, dashboard, login_status]
    )

# Launch
if __name__ == "__main__":
    app.launch(
        theme=gr.themes.Soft(),
        css=custom_css,
        server_name="0.0.0.0",
        server_port=int(os.environ.get("PORT", 10000)),
        share=False
    )
