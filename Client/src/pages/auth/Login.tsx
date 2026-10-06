import { LoginForm } from "../../forms/login.form";

// LoginForm now renders the full page (background, desktop visual and card),
// so this page only needs to provide the semantic <main> landmark.
export const LoginPage = () => {
  return (
    <main>
      <LoginForm />
    </main>
  );
};