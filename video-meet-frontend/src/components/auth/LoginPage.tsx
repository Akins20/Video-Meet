"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import { AppDispatch } from "@/store";


const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const dispatch = useDispatch<AppDispatch>();
    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: LoginForm) => {
        try {
            const credentials = {
                emailOrUsername: data.email,
                password: data.password,
            };
            const user = await login(credentials); // use useAuth's login
            router.push("/dashboard");
        } catch (err) {
            console.error(err);
            alert("Invalid credentials");
        }
    };

    return (
        <div className="max-w-md mx-auto py-8">
            <h1 className="text-xl font-semibold mb-4">Login</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input type="email" placeholder="Email" {...register("email")} />
                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}

                <Input type="password" placeholder="Password" {...register("password")} />
                {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}

                <Button type="submit">Login</Button>
            </form>
        </div>
    );
}
