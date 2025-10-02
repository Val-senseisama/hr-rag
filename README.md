# ValTech HRBot

AI-powered HR assistant for document management and company collaboration.

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables by creating a `.env.local` file:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/next-app

# JWT
JWT_SECRET=your-jwt-secret-key-here

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Email Configuration

The app supports email invitations and notifications. To enable email functionality:

1. **Gmail Setup:**
   - Enable 2-factor authentication on your Gmail account
   - Generate an App Password for this application
   - Use the App Password as `SMTP_PASS`

2. **Other SMTP Providers:**
   - Update `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` accordingly

3. **Development Mode:**
   - If SMTP is not configured, the app will log warnings but continue to function
   - Email sending will be skipped gracefully

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
