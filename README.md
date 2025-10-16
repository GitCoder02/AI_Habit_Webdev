# AI Habit Webdev

AI Habit Webdev is a powerful, full-stack web application designed to help you build and maintain positive habits. It offers a suite of tools for tracking your progress, setting goals, and managing your schedule, all enhanced with AI-powered suggestions to keep you motivated and on track.

-----

## Features

  * **Habit Tracking:** Create, track, and manage your daily habits. Monitor your streaks and celebrate your progress.
  * **Goal Setting:** Define and manage your long-term goals. Track your progress with a percentage-based system.
  * **Interactive Calendar:** Visualize your schedule with a full-featured calendar. Integrate with Google Calendar to see all your events in one place.
  * **AI-Powered Suggestions:** Receive intelligent suggestions to improve your habits, set achievable goals, and optimize your schedule for peak productivity.
  * **User Authentication:** Secure user authentication with JWT (JSON Web Tokens).

-----

## Tech Stack

### Frontend

  * **React:** A JavaScript library for building user interfaces.
  * **React Router:** For declarative routing in your application.
  * **Axios:** For making HTTP requests to the backend API.
  * **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
  * **Recharts:** A composable charting library built on React components.
  * **date-fns:** A modern JavaScript date utility library.

### Backend

  * **Node.js:** A JavaScript runtime built on Chrome's V8 JavaScript engine.
  * **Express:** A fast, unopinionated, minimalist web framework for Node.js.
  * **MongoDB:** A cross-platform document-oriented database program.
  * **Mongoose:** An ODM (Object Data Modeling) library for MongoDB and Node.js.
  * **JWT (JSON Web Tokens):** For secure user authentication.
  * **Google Gemini:** Used for generating AI-powered suggestions.

-----

## Project Structure

```
ai_habit_webdev/
├── backend/
│   ├── models/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── server.js
└── frontend/
    ├── public/
    └── src/
        ├── components/
        ├── context/
        ├── pages/
        └── App.js
```

-----

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

  * Node.js and npm (or yarn) installed on your machine.
  * A MongoDB database instance (local or cloud-based).
  * A Google Cloud project with the Gemini API enabled.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/ai_habit_webdev.git
    cd ai_habit_webdev
    ```

2.  **Install backend dependencies:**

    ```bash
    cd backend
    npm install
    ```

3.  **Install frontend dependencies:**

    ```bash
    cd ../frontend
    npm install
    ```

### Environment Variables

Create a `.env` file in the `backend` directory and add the following:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri
CLIENT_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key
USE_GEMINI=true
```

Create a `.env` file in the `frontend` directory and add the following:

```
REACT_APP_API_URL=http://localhost:5000/api
```

### Running the Application

1.  **Start the backend server:**

    ```bash
    cd backend
    npm run dev
    ```

2.  **Start the frontend development server:**

    ```bash
    cd ../frontend
    npm start
    ```

The application will be available at `http://localhost:3000`.

-----

## Available Scripts

### Backend

  * `npm start`: Starts the server in production mode.
  * `npm run dev`: Starts the server in development mode with `nodemon`.

### Frontend

  * `npm start`: Runs the app in development mode.
  * `npm test`: Launches the test runner.
  * `npm run build`: Builds the app for production.
  * `npm run eject`: Ejects the app from Create React App.

-----

## API Endpoints

The backend provides the following API endpoints:

  * **Authentication:** `/api/auth/register`, `/api/auth/login`
  * **Habits:** `/api/habits` (GET, POST), `/api/habits/:id` (PUT, DELETE)
  * **Goals:** `/api/goals` (GET, POST), `/api/goals/:id` (PUT, DELETE)
  * **Events:** `/api/events` (GET, POST), `/api/events/:id` (PUT, DELETE)
  * **Dashboard:** `/api/dashboard` (GET)
  * **AI Suggestions:** `/api/ai/suggestions` (GET)
  * **Google Calendar:** `/api/google/auth-url`, `/api/google/callback`, `/api/google/events`

-----



## Contributing

Contributions are welcome\! If you have suggestions for improving the application, please open an issue or submit a pull request.
