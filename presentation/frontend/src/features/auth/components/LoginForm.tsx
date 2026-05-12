'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { loginSchema, type LoginFormValues } from "../schemas/login.schema";
import { useAuth } from "../hooks/useAuth";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Scan } from "lucide-react";
import { useState } from "react";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-gray-100 px-4 sm:px-6 lg:px-8">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />

      {/* Main card container */}
      <div className="relative w-full max-w-md">
        {/* Header section */}
        <div className="mb-8 space-y-3 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-linear-to-br from-blue-500 to-cyan-600 mb-4 shadow-lg">
            <Scan className="h-7 w-7 text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
              GradeLens
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Optical Mark Recognition
            </h1>
          </div>
          <p className="text-base text-gray-600">
            Sign in to your account and start grading in seconds
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Email field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-gray-900">
                      Email address
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="educator@gradelens.app"
                        autoComplete="email"
                        className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:ring-blue-500/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600 text-xs" />
                  </FormItem>
                )}
              />

              {/* Password field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-semibold text-gray-900">
                        Password
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="**********"
                        autoComplete="current-password"
                        className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:ring-blue-500/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-600 text-xs" />
                  </FormItem>
                )}
              />

              {/* Submit button */}
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-11 mt-6 bg-linear-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to GradeLens</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

            </form>
          </Form>
        </div>

        {/* Footer text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            New to GradeLens? Send an email to{" "}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              master@gradelens.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
