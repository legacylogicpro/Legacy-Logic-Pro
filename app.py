import gradio as gr
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from groq import Groq
import pytesseract
from pdf2image import convert_from_path
from PyPDF2 import PdfReader
from docx import Document
from PIL import Image
import io
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

# OCR and text extraction functions
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
        return {1: f"Error extracting text: {str(e)}"}

def extract_text_from_image(image_path):
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return {1: text}
    except Exception as e:
        return {1: f"Error extracting text: {str(e)}"}

def ocr_pdf(pdf_path):
    try:
        images = convert_from_path(pdf_path)
        text_by_page = {}
        for page_num, image in enumerate(images, start=1):
            text = pytesseract.image_to_string(image)
            text_by_page[page_num] = text
        return text_by_page
    except Exception as e:
        return {1: f"Error during OCR: {str(e)}"}

def process_document(file):
    if file is None:
        return "No file uploaded", None
    
    file_ext = file.name.split('.')[-1].lower()
    
    if file_ext == 'pdf':
        text_by_page = extract_text_from_pdf(file.name)
        if not any(text_by_page.values()) or all(len(t.strip()) < 50 for t in text_by_page.values()):
            text_by_page = ocr_pdf(file.name)
    elif file_ext in ['png', 'jpg', 'jpeg']:
        text_by_page = extract_text_from_image(file.name)
    else:
        return "Unsupported file format", None
    
    return "Document processed successfully", text_by_page

def answer_question(question, text_by_page, history):
    if not text_by_page:
        return "Please upload and process a document first."
    
    context = "\n\n".join([f"Page {page}: {text}" for page, text in text_by_page.items()])
    
    prompt = f"""You are a tax document assistant for Chartered Accountants. Answer based ONLY on the document provided.

Document Content:
{context}

Question: {question}

Instructions:
- Answer ONLY from the document content above
- Cite page numbers for every fact using [Page X] format
- If information is not in the document, say "Information not found in document"
- Be precise and professional

Answer:"""
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1024
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error: {str(e)}"

# Authentication functions
def login_user(email, password):
    """Login user with Firebase Authentication"""
    try:
        # Firebase Admin SDK doesn't support password verification directly
        # You need to use Firebase REST API or client SDK
        # For now, we'll check if user exists in Firestore
        
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', email).limit(1).get()
        
        if not query:
            return False, "Invalid email or password", None
        
        user_doc = query[0]
        user_data = user_doc.to_dict()
        
        # In production, use proper password hashing (bcrypt, etc.)
        if user_data.get('password') == password:
            return True, "Login successful!", user_data.get('user_id')
        else:
            return False, "Invalid email or password", None
            
    except Exception as e:
        return False, f"Login error: {str(e)}", None

def logout_user():
    """Logout user"""
    return None, None, None, None, "Logged out successfully"

# UI Functions
def create_login_interface():
    """Create login screen"""
    with gr.Blocks(theme=gr.themes.Soft()) as login_interface:
        gr.Markdown("# 🔐 Legacy Logic Pro - Login")
        gr.Markdown("### AI-Powered Document Processing for Chartered Accountants")
        
        with gr.Row():
            with gr.Column(scale=1):
                pass
            with gr.Column(scale=1):
                email_input = gr.Textbox(label="📧 Email", placeholder="Enter your email")
                password_input = gr.Textbox(label="🔒 Password", type="password", placeholder="Enter your password")
                login_btn = gr.Button("Login", variant="primary", size="lg")
                login_status = gr.Textbox(label="Status", interactive=False)
            with gr.Column(scale=1):
                pass
        
        # Hidden outputs to store session
        user_id_state = gr.State(None)
        logged_in_state = gr.State(False)
        
        def handle_login(email, password):
            success, message, user_id = login_user(email, password)
            if success:
                return message, user_id, True
            else:
                return message, None, False
        
        login_btn.click(
            fn=handle_login,
            inputs=[email_input, password_input],
            outputs=[login_status, user_id_state, logged_in_state]
        )
        
    return login_interface, user_id_state, logged_in_state

def create_dashboard(user_id):
    """Create main dashboard (only shown after login)"""
    with gr.Blocks(theme=gr.themes.Soft()) as dashboard:
        # Header
        with gr.Row():
            gr.Markdown("# 🚀 Legacy Logic Pro")
            logout_btn = gr.Button("Logout", variant="secondary", size="sm")
        
        gr.Markdown("### AI-Powered Document Processing for Chartered Accountants")
        gr.Markdown("### With Page-Level Citations")
        gr.Markdown("Built with ❤️ by Tarun in Mumbai")
        
        # State variables
        text_by_page_state = gr.State(None)
        
        # Tabs
        with gr.Tabs():
            # Process Documents Tab
            with gr.Tab("📄 Process Documents"):
                gr.Markdown("## Upload and Process Documents")
                gr.Markdown("Upload PDF or image files. The system will extract text and track page numbers for accurate citations.")
                
                file_input = gr.File(label="📁 Upload Document (PDF, PNG, JPG)", file_types=[".pdf", ".png", ".jpg", ".jpeg"])
                process_btn = gr.Button("Process Document", variant="primary")
                process_output = gr.Textbox(label="Processing Status", lines=2)
                
                process_btn.click(
                    fn=process_document,
                    inputs=[file_input],
                    outputs=[process_output, text_by_page_state]
                )
            
            # Ask Questions Tab
            with gr.Tab("💬 Ask Questions"):
                gr.Markdown("## Ask Questions About Your Documents")
                gr.Markdown("Get AI-powered answers with page-level citations from your processed documents.")
                
                chatbot = gr.Chatbot(label="Conversation", height=400)
                question_input = gr.Textbox(label="Your Question", placeholder="Ask anything about the document...")
                ask_btn = gr.Button("Ask", variant="primary")
                
                def respond(question, text_by_page, history):
                    if not text_by_page:
                        history.append((question, "⚠️ Please upload and process a document first."))
                        return history, ""
                    
                    answer = answer_question(question, text_by_page, history)
                    history.append((question, answer))
                    return history, ""
                
                ask_btn.click(
                    fn=respond,
                    inputs=[question_input, text_by_page_state, chatbot],
                    outputs=[chatbot, question_input]
                )
            
            # History Tab
            with gr.Tab("📊 History"):
                gr.Markdown("## Your Document Processing History")
                history_output = gr.Textbox(label="Recent Activity", lines=10, value="No history yet.")
            
            # Account Tab
            with gr.Tab("👤 Account"):
                gr.Markdown(f"## Account Information")
                gr.Markdown(f"**User ID:** {user_id}")
                gr.Markdown(f"**Status:** Active")
        
        # Logout functionality
        logout_status = gr.Textbox(visible=False)
        logout_btn.click(
            fn=logout_user,
            outputs=[text_by_page_state, chatbot, question_input, history_output, logout_status]
        )
        
    return dashboard, logout_status

# Main App
def main():
    """Main application with conditional rendering"""
    
    # Create login interface
    login_interface, user_id_state, logged_in_state = create_login_interface()
    
    # Launch app
    login_interface.launch(
        server_name="0.0.0.0",
        server_port=10000,
        share=False
    )

if __name__ == "__main__":
    main()
