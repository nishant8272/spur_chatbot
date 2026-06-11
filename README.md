# Spur AI Live Chat Agent

A small web app that simulates a customer support chat where an AI agent answers user questions using Groq.

## Tech Stack

- **Backend**: Node.js + TypeScript + Express + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **LLM**: Groq with Llama 3.3 70B Versatile

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Groq API key
- PostgreSQL database (local or cloud)

### Setup

1. Clone the repository

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Backend Environment Variables**
   - Copy `.env.example` to `.env` in the backend directory
   - Add your PostgreSQL URL and Groq API key:
     ```
     PORT=3001
     DATABASE_URL=your_postgresql_database_url_here
     GROQ_API_KEY=your_groq_api_key_here
     ```

4. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```
   - Copy `.env.example` to `.env` in the frontend directory
   - Set the backend API URL:
     ```
     VITE_API_BASE_URL=http://localhost:3001
     ```

### Running the App

1. **Start the backend server** (in one terminal):
   ```bash
   cd backend
   npm run dev
   ```

   The database will automatically initialize and seed with FAQs on first run.

2. **Start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and go to the URL shown in the frontend terminal (usually `http://localhost:5173`)

## How to Use

- Type a message in the input box and press Enter or click Send
- The AI agent will respond to your questions
- Conversation history is automatically saved and loaded on page refresh

## Architecture Overview

### Backend

- `src/index.ts`: Main server file with API endpoints
- `src/db.ts`: PostgreSQL database setup, operations, and FAQ seeding
- `src/llm.ts`: Groq LLM integration with FAQ context

### Frontend

- `src/App.tsx`: Main chat component with state management
- `src/App.css`: Chat UI styling

## Database Schema

- `conversations`: Stores conversation sessions
- `messages`: Stores user and AI messages
- `faqs`: Stores frequently asked questions (seeded on first run)

## LLM Notes

- **Provider**: Groq
- **Model**: Llama 3.3 70B Versatile
- **System Prompt**: Uses FAQs stored in PostgreSQL for accurate answers
- **Conversation History**: Past messages are included for context

## Trade-offs & "If I had more time..."

- **Error Handling**: Basic error handling implemented; could add more robust recovery and logging
- **Styling**: Simple CSS; could use a design system for better UI
- **Testing**: No tests implemented; would add unit and integration tests
- **Authentication**: No auth; could add user accounts
- **Caching**: Could add Redis for caching frequent responses
