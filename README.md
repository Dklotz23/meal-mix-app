# Meal Mix

Meal planning app built with React, Vite, Firebase Authentication, and Firestore.

## Firebase setup

1. In Firebase Console, enable **Authentication > Sign-in method > Email/Password**.
2. Deploy [firestore.rules](firestore.rules) to the `weekly-meal-mix` project.
3. Copy the Firebase web app settings into the local `.env` file using the existing `VITE_*` variable names.

New accounts are seeded with the catalog in [src/lib/seedMeals.js](src/lib/seedMeals.js). Each account's meals, pantry, and weekly plan are stored under `households/{userId}`.

## Development

```bash
npm install
npm run dev
```

Run `npm run lint` and `npm run build` before deploying.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
