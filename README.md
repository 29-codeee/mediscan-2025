# MediScan - Health Intelligence System

A comprehensive healthcare management application built with Next.js, featuring AI-powered prescription scanning, medication reminders, emergency response, and intelligent medical chat assistance.

## Features

- 🔐 **Secure OTP Authentication** - Email and SMS verification
- 📸 **AI Prescription Scanner** - Powered by Google Gemini Vision
- 💊 **Smart Pill Reminders** - Medication tracking and notifications
- 🤖 **Healix AI Chat** - Intelligent medical assistant
- 🚨 **SOS Emergency System** - 24/7 emergency response
- 👥 **Emergency Contacts** - Quick access to medical contacts
- 📊 **Health Dashboard** - Comprehensive health overview

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini AI
- **Email**: Resend
- **Authentication**: OTP-based system

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd mediscan
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your services:

```bash
cp .env.example .env.local
```

Fill in the following required environment variables:

#### Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your URL and anon key
3. Run the database schema from `supabase-schema.sql` in your Supabase SQL editor

#### Google AI (Gemini)
1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env.local`

#### Email Service (Resend)
1. Sign up at [resend.com](https://resend.com)
2. Get your API key and add it to `.env.local`

### 3. Database Setup

Run the SQL schema in your Supabase project:

```sql
-- Copy and paste the contents of supabase-schema.sql
-- into your Supabase SQL editor and execute
```

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

## API Endpoints

### Authentication
- `POST /api/send-otp` - Send OTP for verification
- `POST /api/verify-otp` - Verify OTP code
- `POST /api/auth/login` - User login

### Health Features
- `POST /api/prescriptions/scan` - Scan prescription with AI
- `GET /api/medications` - Get user's medications
- `POST /api/medications` - Add new medication
- `GET /api/reminders` - Get pill reminders
- `POST /api/reminders` - Create pill reminder

### AI & Communication
- `POST /api/chat` - Chat with AI medical assistant
- `GET /api/chat` - Get chat history

### Emergency
- `POST /api/emergency` - Trigger emergency alert
- `GET /api/emergency/contacts` - Get emergency contacts
- `POST /api/emergency/contacts` - Add emergency contact

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
mediscan/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── components/        # Reusable components
│   └── globals.css        # Global styles
├── lib/                   # Utility libraries
├── supabase-schema.sql    # Database schema
└── .env.example          # Environment template
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Other Platforms

Make sure to:
- Set all environment variables
- Configure your database for production
- Set up proper CORS policies
- Enable HTTPS

## Security Notes

- All API routes include proper error handling
- Row Level Security (RLS) is enabled on all database tables
- OTP codes expire after 10 minutes
- User data is properly validated and sanitized

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact the development team or create an issue in the repository.

---

**⚠️ Medical Disclaimer**: This application is for informational purposes only and should not replace professional medical advice. Always consult healthcare professionals for medical decisions.