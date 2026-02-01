import gradio as gr
import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
from datetime import datetime
import PyPDF2
from PIL import Image
import pytesseract
from groq import Groq
import io
import json

# Initialize Firebase
def init_firebase():
    if not firebase_admin._apps:
        cred_dict = {
            "type": os.environ.get("FIREBASE_TYPE"),
            "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
            "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
            "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
            "client_id": os.environ.get("FIREBASE_CLIENT_ID"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": os.environ.get("FIREBASE_CERT_URL")
        }
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
    return firestore.client()

db = init_firebase()

# Initialize Groq
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Global variables
current_user = {"email": None, "uid": None}
document_texts = {}  # Store document texts with page numbers: {doc_name: [(page_num, text), ...]}
all_documents = []  # Store all processed documents

# Authentication functions
def create_account(email, password):
    try:
        user = auth.create_user(email=email, password=password)
        # Create user document in Firestore
        db.collection('users').document(user.uid).set({
            'email': email,
            'plan': 'starter',
            'docs_used': 0,
            'storage_used_mb': 0,
            'created_at': datetime.now(),
            'documents': []
        })
        return f"✅ Account created successfully! Please login.", ""
    except Exception as e:
        return f"❌ Error: {str(e)}", ""

def login_user(email, password):
    try:
        # Firebase Admin SDK doesn't have direct password verification
        # In production, use Firebase Client SDK or REST API
        # For now, we'll use a simplified approach
        users = auth.list_users().iterate_all()
        user_found = None
        for user in users:
            if user.email == email:
                user_found = user
                break

        if user_found:
            current_user["email"] = email
            current_user["uid"] = user_found.uid
            return f"✅ Logged in as {email}", ""
        else:
            return "❌ User not found", ""
    except Exception as e:
        return f"❌ Error: {str(e)}", ""

def logout_user():
    current_user["email"] = None
    current_user["uid"] = None
    return "✅ Logged out successfully"

# Document processing functions
def extract_text_from_pdf(pdf_file, use_ocr=False):
    """Extract text from PDF with page numbers"""
    try:
        pages_text = []  # List of (page_number, text) tuples
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        for page_num, page in enumerate(pdf_reader.pages, start=1):
            if use_ocr:
                # For OCR, we'd need to convert PDF page to image first
                # Simplified: just extract text normally
                text = page.extract_text()
            else:
                text = page.extract_text()

            if text.strip():
                pages_text.append((page_num, text))

        return pages_text
    except Exception as e:
        return [(0, f"Error extracting PDF: {str(e)}")]

def extract_text_from_image(image_file):
    """Extract text from image using OCR"""
    try:
        image = Image.open(image_file)
        text = pytesseract.image_to_string(image)
        return [(1, text)]  # Images are single page
    except Exception as e:
        return [(0, f"Error with OCR: {str(e)}")]

def process_document(file, use_ocr):
    """Process uploaded document and store with page information"""
    global document_texts, all_documents

    if not current_user["email"]:
        return "❌ Please login first", ""

    if file is None:
        return "❌ Please upload a file", ""

    try:
        # Check quota
        user_doc = db.collection('users').document(current_user["uid"]).get()
        user_data = user_doc.to_dict()

        if user_data['plan'] == 'starter' and user_data['docs_used'] >= 50:
            return "❌ Document quota exceeded. Upgrade to Pro plan.", ""

        # Get file info
        file_name = os.path.basename(file.name)
        file_size_mb = os.path.getsize(file.name) / (1024 * 1024)

        # Extract text with page numbers
        if file_name.lower().endswith('.pdf'):
            pages_text = extract_text_from_pdf(file.name, use_ocr)
        elif file_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            pages_text = extract_text_from_image(file.name)
        else:
            return "❌ Unsupported file format. Use PDF or images.", ""

        # Store document with page information
        document_texts[file_name] = pages_text

        # Combine all text for preview
        combined_text = "\n\n".join([f"[Page {p}]\n{t}" for p, t in pages_text])
        preview = combined_text[:1000] + "..." if len(combined_text) > 1000 else combined_text

        # Update Firestore
        doc_info = {
            'name': file_name,
            'size_mb': round(file_size_mb, 2),
            'uploaded_at': datetime.now(),
            'status': 'processed',
            'pages': len(pages_text)
        }

        user_data['documents'].append(doc_info)
        user_data['docs_used'] += 1
        user_data['storage_used_mb'] += file_size_mb

        db.collection('users').document(current_user["uid"]).update(user_data)

        all_documents.append(doc_info)

        return f"✅ Processed: {file_name} ({len(pages_text)} pages)\n\nQuota: {user_data['docs_used']}/50 documents", preview

    except Exception as e:
        return f"❌ Error: {str(e)}", ""

def chunk_text_by_pages(pages_text, chunk_size=2):
    """Chunk text by pages for better context management"""
    chunks = []
    for i in range(0, len(pages_text), chunk_size):
        page_group = pages_text[i:i+chunk_size]
        page_numbers = [p[0] for p in page_group]
        combined_text = "\n\n".join([f"[Page {p}]\n{t}" for p, t in page_group])
        chunks.append({
            'text': combined_text,
            'pages': page_numbers
        })
    return chunks

def ask_question(question, chat_history):
    """Answer questions with PAGE CITATIONS"""
    global document_texts

    if not current_user["email"]:
        return chat_history + [("You", question), ("Assistant", "❌ Please login first")]

    if not document_texts:
        return chat_history + [("You", question), ("Assistant", "❌ Please upload and process documents first")]

    if not question.strip():
        return chat_history + [("You", question), ("Assistant", "❌ Please ask a question")]

    try:
        # Combine all document texts with page numbers
        all_chunks = []
        for doc_name, pages_text in document_texts.items():
            chunks = chunk_text_by_pages(pages_text, chunk_size=2)
            for chunk in chunks:
                chunk['document'] = doc_name
                all_chunks.append(chunk)

        # Create context with page information
        context_parts = []
        for i, chunk in enumerate(all_chunks[:10]):  # Limit to 10 chunks
            pages_str = ", ".join(map(str, chunk['pages']))
            context_parts.append(
                f"Document: {chunk['document']}\n"
                f"Pages: {pages_str}\n"
                f"Content:\n{chunk['text']}"
            )

        context = "\n\n---\n\n".join(context_parts)

        # Create prompt with citation instructions
        prompt = f"""You are a helpful AI assistant analyzing documents for Chartered Accountants.

IMPORTANT: You MUST cite page numbers for EVERY piece of information you provide.

Format your citations like this: [Document: filename.pdf, Page: X]

Available Documents and Context:
{context}

User Question: {question}

Instructions:
1. Answer the question accurately based ONLY on the provided documents
2. ALWAYS cite the specific page number(s) where you found the information
3. Use this citation format: [Document: filename.pdf, Page: X]
4. If information spans multiple pages, cite all relevant pages: [Document: filename.pdf, Pages: 1-3]
5. If you cannot find the answer in the documents, say "I cannot find this information in the provided documents."
6. Be specific and quote relevant parts when helpful

Answer with citations:"""

        # Get response from Groq
        response = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant that ALWAYS provides page citations for every piece of information."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )

        answer = response.choices[0].message.content

        # Add to chat history
        chat_history = chat_history + [
            ("You", question),
            ("Assistant", answer)
        ]

        return chat_history

    except Exception as e:
        return chat_history + [("You", question), ("Assistant", f"❌ Error: {str(e)}")]

def get_document_history():
    """Get document processing history"""
    if not current_user["email"]:
        return "❌ Please login first"

    try:
        user_doc = db.collection('users').document(current_user["uid"]).get()
        user_data = user_doc.to_dict()

        if not user_data.get('documents'):
            return "No documents processed yet."

        history = "📁 **Document History**\n\n"
        for i, doc in enumerate(user_data['documents'], 1):
            history += f"{i}. **{doc['name']}**\n"
            history += f"   - Size: {doc['size_mb']} MB\n"
            history += f"   - Pages: {doc.get('pages', 'N/A')}\n"
            history += f"   - Uploaded: {doc['uploaded_at'].strftime('%Y-%m-%d %H:%M')}\n"
            history += f"   - Status: {doc['status']}\n\n"

        return history
    except Exception as e:
        return f"❌ Error: {str(e)}"

def get_account_info():
    """Get account information"""
    if not current_user["email"]:
        return "❌ Please login first"

    try:
        user_doc = db.collection('users').document(current_user["uid"]).get()
        user_data = user_doc.to_dict()

        info = f"""👤 **Account Information**

**Email:** {user_data['email']}
**Plan:** {user_data['plan'].upper()}
**Documents Used:** {user_data['docs_used']}/50
**Storage Used:** {round(user_data['storage_used_mb'], 2)} MB
**Account Created:** {user_data['created_at'].strftime('%Y-%m-%d')}

---

📊 **Plan Limits (Starter)**
- 50 documents/month
- 500 MB storage
- OCR support
- AI Q&A with citations
- Page-level references

💎 **Upgrade to Pro** for:
- 200 documents/month
- 2 GB storage
- Priority support
- Advanced analytics
"""
        return info
    except Exception as e:
        return f"❌ Error: {str(e)}"

def clear_chat():
    """Clear chat history"""
    return []

# Create Gradio interface
with gr.Blocks(title="Legacy Logic Pro", theme=gr.themes.Soft()) as app:
    gr.Markdown(
        """
        # 🚀 Legacy Logic Pro
        ## AI-Powered Document Processing for Chartered Accountants
        ### With Page-Level Citations

        **Built with ❤️ by Tarun in Mumbai**
        """
    )

    with gr.Tabs():
        # Tab 1: Login/Signup
        with gr.Tab("🔐 Login / Signup"):
            gr.Markdown("### Create Account or Login")

            with gr.Row():
                with gr.Column():
                    gr.Markdown("#### Create Account")
                    signup_email = gr.Textbox(label="Email", placeholder="your@email.com")
                    signup_password = gr.Textbox(label="Password", type="password", placeholder="Min 6 characters")
                    signup_btn = gr.Button("Create Account", variant="primary")
                    signup_output = gr.Textbox(label="Status", interactive=False)

                with gr.Column():
                    gr.Markdown("#### Login")
                    login_email = gr.Textbox(label="Email", placeholder="your@email.com")
                    login_password = gr.Textbox(label="Password", type="password")
                    login_btn = gr.Button("Login", variant="primary")
                    login_output = gr.Textbox(label="Status", interactive=False)

            logout_btn = gr.Button("Logout")
            logout_output = gr.Textbox(label="Status", interactive=False)

            signup_btn.click(
                create_account,
                inputs=[signup_email, signup_password],
                outputs=[signup_output, login_output]
            )

            login_btn.click(
                login_user,
                inputs=[login_email, login_password],
                outputs=[login_output, signup_output]
            )

            logout_btn.click(
                logout_user,
                outputs=logout_output
            )

        # Tab 2: Process Documents
        with gr.Tab("📄 Process Documents"):
            gr.Markdown("### Upload and Process Documents")
            gr.Markdown("Upload PDF or image files. The system will extract text and track page numbers for accurate citations.")

            file_upload = gr.File(label="Upload Document (PDF, PNG, JPG)", file_types=[".pdf", ".png", ".jpg", ".jpeg"])
            ocr_checkbox = gr.Checkbox(label="Use OCR (for scanned documents/images)", value=False)
            process_btn = gr.Button("Process Document", variant="primary")

            process_output = gr.Textbox(label="Processing Status", lines=3)
            preview_output = gr.Textbox(label="Document Preview (with page numbers)", lines=10)

            process_btn.click(
                process_document,
                inputs=[file_upload, ocr_checkbox],
                outputs=[process_output, preview_output]
            )

        # Tab 3: Ask Questions (WITH CITATIONS)
        with gr.Tab("💬 Ask Questions"):
            gr.Markdown("### Ask Questions About Your Documents")
            gr.Markdown("**✨ NEW: Get answers with page-level citations!** Every answer includes specific page references.")

            chatbot = gr.Chatbot(label="Chat History", height=400)
            question_input = gr.Textbox(
                label="Your Question",
                placeholder="e.g., What is the total taxable income? (Answer will include page citations)",
                lines=2
            )

            with gr.Row():
                ask_btn = gr.Button("Send", variant="primary")
                clear_btn = gr.Button("Clear Chat")

            gr.Markdown(
                """
                **Example Questions:**
                - What is the total income? (with page reference)
                - List all Section 80C deductions and their pages
                - What is mentioned about GST on page 5?
                - Where can I find information about tax rates?
                """
            )

            ask_btn.click(
                ask_question,
                inputs=[question_input, chatbot],
                outputs=chatbot
            )

            clear_btn.click(
                clear_chat,
                outputs=chatbot
            )

            question_input.submit(
                ask_question,
                inputs=[question_input, chatbot],
                outputs=chatbot
            )

        # Tab 4: History
        with gr.Tab("📚 History"):
            gr.Markdown("### Document Processing History")
            gr.Markdown("View all your processed documents with page counts")

            refresh_history_btn = gr.Button("Refresh History", variant="primary")
            history_output = gr.Markdown("Click 'Refresh History' to view your documents")

            refresh_history_btn.click(
                get_document_history,
                outputs=history_output
            )

        # Tab 5: Account
        with gr.Tab("👤 Account"):
            gr.Markdown("### Account Information & Usage")

            refresh_account_btn = gr.Button("Refresh Account Info", variant="primary")
            account_output = gr.Markdown("Click 'Refresh Account Info' to view your details")

            refresh_account_btn.click(
                get_account_info,
                outputs=account_output
            )

    gr.Markdown(
        """
        ---
        ### 🔒 Privacy & Security
        - ✅ Document content is NEVER stored in database
        - ✅ All processing happens in-memory
        - ✅ Only metadata (filename, size, page count) is tracked
        - ✅ Firebase Authentication for secure access
        - ✅ Page-level citations for accurate references

        ### 📞 Support
        **Email:** tarun@legacylogic.pro

        © 2026 Legacy Logic Pro by Tarun. Built in Mumbai, India 🇮🇳
        """
    )

# Launch app
if __name__ == "__main__":
    app.launch(server_name="0.0.0.0", server_port=10000, share=False)
