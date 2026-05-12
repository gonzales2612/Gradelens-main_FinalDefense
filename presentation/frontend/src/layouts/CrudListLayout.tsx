import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { Loading } from "@/components/loading";

type Props = {
    title: string;
    subtitle?: string;
    addLabel?: string;
    onAdd?: () => void;
    isLoading?: boolean;
    error?: string | null;
    itemsLength?: number;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyActionLabel?: string;
    children?: React.ReactNode;
};

export function CrudListLayout({
    title,
    subtitle,
    addLabel = "Add",
    onAdd,
    isLoading,
    error,
    itemsLength = 0,
    emptyTitle = "No items yet",
    emptyDescription = "Create your first item to get started",
    emptyActionLabel = "Create",
    children,
}: Props) {
    return (
        <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
            {onAdd && (
            <Button onClick={onAdd}>
                <IconPlus className="mr-2 h-4 w-4" />
                {addLabel}
            </Button>
            )}
        </div>

        {error ? (
            <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-destructive">{error}</p>
            </CardContent>
            </Card>
        ) : isLoading && itemsLength === 0 ? (
            <div className="p-8"><Loading text="Loading..." /></div>
        ) : itemsLength === 0 ? (
            <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
                <h3 className="text-lg font-medium">{emptyTitle}</h3>
                <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                {onAdd && (
                <div className="mt-6">
                    <Button onClick={onAdd} variant="outline">
                    <IconPlus className="mr-2 h-4 w-4" />
                    {emptyActionLabel}
                    </Button>
                </div>
                )}
            </CardContent>
            </Card>
        ) : (
            <div>{children}</div>
        )}
        </div>
    );
}

export default CrudListLayout;
