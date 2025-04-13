
# MeetWise

## Project Overview

MeetWise is an innovative platform designed to help participants connect during events like datathons, hackathons, and collaborative gatherings. By leveraging AI-powered profile embeddings, the application enables intelligent participant matching based on skills, interests, and background.

## Key Features

- AI-powered participant matching
- Intelligent embedding generation
- Event participation tracking
- Profile creation and management

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or later)
- npm (v9 or later)
- A modern web browser

## Project Setup

### 1. Clone the Repository

```sh
git clone <YOUR_PROJECT_REPOSITORY_URL>
cd meetwise
```

### 2. Install Dependencies

```sh
npm install
```

### 3. Set Up Supabase

1. Click on the Supabase button in the Lovable interface
2. Connect your Supabase project
3. Ensure all edge functions are deployed

### 4. Environment Configuration

Create a `.env` file in the project root and add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Start Development Server

```sh
npm run dev
```

The application will be available at `http://localhost:3000`

## Deployment

1. Open the project in Lovable
2. Click "Publish" in the top right corner
3. (Optional) Connect a custom domain in Project Settings

## Technologies

- React
- TypeScript
- Tailwind CSS
- Supabase
- Shadcn UI
- AI Embedding Generation (Gemini)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Your Name - [Your Email or Social Media]
Project Link: https://lovable.dev/projects/4934a3ec-5950-4df3-9274-e548015252ac
