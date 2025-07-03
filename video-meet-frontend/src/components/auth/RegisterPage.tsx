"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";

const schema = z.object({
    username: z.string().min(2, 'Username is required'),
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email(),
    password: z.string().min(6),
});

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
    const router = useRouter();
    const { register: registerUser } = useAuth();
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: RegisterForm) => {
        try {
            await registerUser({
                ...data,
                rememberMe: false, // or true if you want
            });
            router.push("/login");
        } catch (err) {
            console.error(err);
            alert("Registration failed");
        }
    };

    return (
        <div className="max-w-md mx-auto py-8">
            <h1 className="text-xl font-semibold mb-4">Register</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input placeholder="Username" {...register("username")} />
                {errors.username && <p className="text-red-500 text-xs">{errors.username.message}</p>}

                <Input placeholder="First Name" {...register("firstName")} />
                {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName.message}</p>}

                <Input placeholder="Last Name" {...register("lastName")} />
                {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName.message}</p>}

                <Input type="email" placeholder="Email" {...register("email")} />
                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}

                <Input type="password" placeholder="Password" {...register("password")} />
                {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}

                <Button type="submit">Register</Button>
            </form>
        </div>
    );
}
