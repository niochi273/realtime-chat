import RegisterForm from "@/components/register-form";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function Register() {
  return (
    <>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Enter your details below to get started.
        </CardDescription>
      </CardHeader>
      <RegisterForm />
    </>
  );
}
