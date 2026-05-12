import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { FileQuestion } from "lucide-react"; // npm install lucide-react if you haven't

export default function NotFoundPage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <div className="flex flex-col items-center gap-2">
            {/* Icon */}
            <div className="rounded-full bg-muted p-6 mb-4">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>
            
            {/* Text Content */}
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">404</h1>
            <h2 className="text-2xl font-semibold">Page not found</h2>
            <p className="mt-2 text-muted-foreground max-w-[450px]">
            Sorry, we couldn’t find the page you’re looking for. It might have been moved or deleted.
            </p>
            
            {/* Action Button */}
            <div className="mt-8">
            <Button asChild size="lg">
                <Link to={ROUTES.DASHBOARD}>
                Back to Dashboard
                </Link>
            </Button>
            </div>
        </div>
        </div>
    );
}