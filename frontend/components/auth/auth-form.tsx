"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { setStoredUser } from "@/lib/auth";

type AuthFormProps = {
  mode: "login" | "register";
  onModeChange?: (mode: "login" | "register") => void;
};

export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isRegister = mode === "register";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fallbackName = email.split("@")[0] || "Trader";

    setStoredUser({
      name: isRegister ? name || fallbackName : fallbackName,
      email
    });

    void password;
    router.push("/dashboard");
  }

  return (
    <Card className="relative w-full max-w-md overflow-hidden rounded-[2rem] p-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent" />
      <div className="mb-8 space-y-5">
        <Logo />
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold text-white">
            {isRegister ? "Create your trading workspace" : "Welcome back"}
          </h1>
          <p className="text-sm leading-6 text-slate-400">
            {isRegister
              ? "Set up your account to access a premium AI-assisted trading dashboard."
              : "Use the simulated authentication flow to continue into the platform."}
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {isRegister ? (
          <Input
            placeholder="Full name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : null}
        <Input
          placeholder="Email address"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          placeholder="Password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button className="mt-2 w-full" type="submit">
          {isRegister ? "Create Account" : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-400">
        {isRegister ? "Already have an account?" : "Need an account?"}{" "}
        <button
          className="font-medium text-fuchsia-300 transition hover:text-fuchsia-200"
          type="button"
          onClick={() => onModeChange?.(isRegister ? "login" : "register")}
        >
          {isRegister ? "Login" : "Register"}
        </button>
      </p>
    </Card>
  );
}
