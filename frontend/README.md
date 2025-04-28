# Umaxship React Frontend

## Description

This repository contains the frontend source code for the Umaxship platform, a shipping aggregator service. This code is built using React.

**Live Demo:** You can see the live version of this application at [www.umaxship.com](https://www.umaxship.com).

**Important Notice:** This codebase is provided for **showcase purposes only**. It is licensed and proprietary. **Copying, distributing, or using this code in any form without explicit written permission from Atirun Techs Pvt Ltd is strictly prohibited.**

## Key Features (Based on App Structure)

*   **Dashboard:** Overview of shipping activities.
*   **Order Management:** Add, process, and clone orders (B2C & B2B).
*   **Reporting:** View shipping reports.
*   **Transactions:** Track financial transactions.
*   **Rate Calculator:** Calculate shipping rates.
*   **User Profile:** Manage user account details.
*   **KYC:** Handle Know Your Customer verification.
*   **Warehouse Management:** Manage warehouse information.
*   **Settings:** Configure application settings.
*   **Payments:** Handle payment information.
*   **Pricing:** View pricing details.
*   **Customer Support:** Access support resources.
*   **Authentication:** User Login and Registration.
*   **Theming:** Supports light/dark mode (indicated by `ThemeContext` and `App.scss`).

## Technologies Used

*   **React:** JavaScript library for building user interfaces.
*   **React Router:** For declarative routing in the application.
*   **SCSS:** For advanced CSS styling.
*   **Context API:** For state management (e.g., `ThemeContext`).

## Getting Started (Development Setup)

These are general instructions for running a React application. Specific environment variables or configurations might be required (see below).

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <repository-url>
    cd umaxship-react-master
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Variables:**
    This project might require environment variables (e.g., for API endpoints). Create a `.env` file in the project root and add the necessary variables, typically prefixed with `REACT_APP_`. Example:
    ```env
    REACT_APP_API_BASE_URL=https://api.yourbackend.com
    ```

4.  **Run the development server:**
    ```bash
    npm start
    # or
    yarn start
    ```
    This will usually open the application in your default web browser at `http://localhost:3000`.

## Development Team

*   Gaurav Singh
*   Garvit Varshney
*   Shivansh Srivastava
*   Rishabh Saxena
---

**License:** All rights reserved. Unauthorized use, reproduction, or distribution of this code is prohibited.