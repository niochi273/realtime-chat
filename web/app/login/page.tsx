import LoginForm from "@/components/login-form";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="mx-auto my-10 w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your details below to get into account.
        </CardDescription>
      </CardHeader>
      <LoginForm />
    </Card>
  );
}
