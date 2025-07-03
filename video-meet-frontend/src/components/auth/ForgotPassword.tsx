"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";

const schema = z.object({
    email: z.string().email(),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(schema),
    });

    const { forgotPassword } = useAuth();

    const onSubmit = async (data: ForgotPasswordForm) => {
        try {
            await forgotPassword(data);
            alert("Reset link sent. Please check your email.");
        } catch (err) {
            console.error(err);
            alert("Failed to send reset link");
        }
    };

    return (
        <div className="max-w-md mx-auto py-8">
            <h1 className="text-xl font-semibold mb-4">Forgot Password</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input placeholder="Email" {...register("email")} />
                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
            </form>
        </div>
    );
}
