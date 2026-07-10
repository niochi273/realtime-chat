"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { CardContent, CardFooter } from "./ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon } from "./ui/input-group";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button } from "./ui/button";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

export default function LoginForm() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(inputData: z.infer<typeof formSchema>) {
    const { email, password } = inputData;

    await signIn.email(
      {
        email,
        password,
      },
      {
        onSuccess: () => {
          router.push("/");
        },
        onError: (ctx) => {
          form.setError("root", { message: ctx.error.message });
        },
      },
    );
  }

  return (
    <>
      <CardContent>
        <form id="login-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="email"
                      aria-invalid={fieldState.invalid}
                      placeholder="example@gmail.com"
                      autoComplete="off"
                    />
                    <InputGroupAddon>
                      <Mail />
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="••••••••"
                      autoComplete="off"
                      type={passwordVisible ? "text" : "password"}
                    />
                    <InputGroupAddon align="inline-end">
                      {passwordVisible ? (
                        <Eye
                          className="cursor-pointer"
                          onClick={() => setPasswordVisible(false)}
                        />
                      ) : (
                        <EyeOff
                          className="cursor-pointer"
                          onClick={() => setPasswordVisible(true)}
                        />
                      )}
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field>
          {form.formState.errors.root && (
            <p className="text-destructive text-sm text-center">
              {form.formState.errors.root.message}
            </p>
          )}
          <Button disabled={isSubmitting} type="submit" form="login-form">
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit"}
          </Button>
          <FieldDescription className="text-center">
            Do not have an account?
            <Link
              href="/register"
              className="hover:text-foreground ml-1 underline underline-offset-4"
            >
              Sign Up
            </Link>
          </FieldDescription>
        </Field>
      </CardFooter>
    </>
  );
}
