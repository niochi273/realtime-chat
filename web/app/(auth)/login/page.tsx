import LoginForm from "@/components/login-form";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your details below to get into account.
        </CardDescription>
      </CardHeader>
      <LoginForm />
    </>
  );
}
