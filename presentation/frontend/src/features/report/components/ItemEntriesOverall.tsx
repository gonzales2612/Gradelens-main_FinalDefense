import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Loading } from "@/components/loading";
import type { IItemEntriesOverall } from "@/features/report/types/reports.types";

type FilterType = "all" | "mastered" | "developing" | "struggling";

interface Props {
    overall?: IItemEntriesOverall | null;
    view?: "overall";
    selectedFilter: FilterType;
    setSelectedFilter: (v: FilterType) => void;
}

export const ItemEntriesOverall: React.FC<Props> = ({ overall, selectedFilter, setSelectedFilter }) => {
    if (!overall) {
        return (
            <Card className="border-border bg-card/50">
                <CardContent className="flex items-center justify-center py-12">
                    <Loading text="Loading overall data..." />
                </CardContent>
            </Card>
        );
    }

    const { items, metadata } = overall;

    const sortedItems = [...items].sort((a, b) => b.percentage - a.percentage);

    let filteredItems = sortedItems;
    if (selectedFilter === "mastered") filteredItems = sortedItems.filter((i) => i.remark === "M");
    else if (selectedFilter === "developing") filteredItems = sortedItems.filter((i) => i.remark === "NM");
    else if (selectedFilter === "struggling") filteredItems = sortedItems.filter((i) => i.remark === "NTM");

    const masteredCount = items.filter((i) => i.remark === "M").length;
    const developingCount = items.filter((i) => i.remark === "NM").length;
    const strugglingCount = items.filter((i) => i.remark === "NTM").length;

    const half = Math.floor(sortedItems.length / 2);
    const bestLearned = sortedItems.slice(0, half);
    const leastLearned = sortedItems.slice(-half).reverse();

    return (
        <Card className="border-border bg-card/50">
        <CardHeader>
            <CardTitle className="text-xl text-foreground">Overall Performance</CardTitle>
            <p className="text-sm text-muted-foreground">Aggregated results across all sections</p>
        </CardHeader>

        <CardContent>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-6">
            <div className="rounded-lg bg-background p-3 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground">Students Took Exam</p>
                <p className="mt-1 text-lg font-bold text-foreground">{metadata.total_students_took_exam}</p>
            </div>
            <div className="rounded-lg bg-background p-3 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground">Total Correct</p>
                <p className="mt-1 text-lg font-bold text-foreground">{metadata.total_correct} / {metadata.total_possible}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
                <p className="text-xs font-medium text-primary">Overall %</p>
                <p className="mt-1 text-lg font-bold text-primary">{metadata.overall_percentage.toFixed(2)}%</p>
            </div>
            <div className="rounded-lg bg-green-500/10 p-3 border border-green-500/20">
                <p className="text-xs font-medium text-green-700">Mastered (≥75%)</p>
                <p className="mt-1 text-lg font-bold text-green-700">{masteredCount} / {metadata.total_questions}</p>
            </div>
            <div className="rounded-lg bg-yellow-500/10 p-3 border border-yellow-500/20">
                <p className="text-xs font-medium text-yellow-700">Developing (60-74%)</p>
                <p className="mt-1 text-lg font-bold text-yellow-700">{developingCount} / {metadata.total_questions}</p>
            </div>
            <div className="rounded-lg bg-red-500/10 p-3 border border-red-500/20">
                <p className="text-xs font-medium text-red-700">Struggling (&lt;60%)</p>
                <p className="mt-1 text-lg font-bold text-red-700">{strugglingCount} / {metadata.total_questions}</p>
            </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
            <Button variant={selectedFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedFilter("all")}>All ({items.length})</Button>
            <Button variant={selectedFilter === "mastered" ? "default" : "outline"} size="sm" className={selectedFilter === "mastered" ? "bg-green-500 hover:bg-green-600 text-white" : ""} onClick={() => setSelectedFilter("mastered")}>Mastered ({masteredCount})</Button>
            <Button variant={selectedFilter === "developing" ? "default" : "outline"} size="sm" className={selectedFilter === "developing" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""} onClick={() => setSelectedFilter("developing")}>Developing ({developingCount})</Button>
            <Button variant={selectedFilter === "struggling" ? "default" : "outline"} size="sm" className={selectedFilter === "struggling" ? "bg-red-500 hover:bg-red-600 text-white" : ""} onClick={() => setSelectedFilter("struggling")}>Struggling ({strugglingCount})</Button>
            </div>

            <div className="mb-6">
            <p className="mb-3 text-sm font-semibold text-foreground">Questions Overview ({filteredItems.length} items)</p>
            <div className="grid gap-2 sm:grid-cols-6 lg:grid-cols-10">
                {filteredItems.map((item) => (
                <div key={item.question_number} className={`flex flex-col items-center rounded border ${item.remark === "M" ? "bg-green-500/20 border-green-500" : item.remark === "NM" ? "bg-yellow-500/20 border-yellow-500" : "bg-red-500/20 border-red-500"} p-2 text-center transition-all hover:scale-105 hover:shadow-md cursor-pointer`} title={`Q${item.question_number}: ${item.percentage}% (${item.correct_count}/${item.total_students})`}>
                    <div className="flex flex-col items-center gap-1">
                    <span className={`text-xs font-bold ${item.remark === "M" ? "text-green-700" : item.remark === "NM" ? "text-yellow-700" : "text-red-700"}`}>Q{item.question_number}</span>
                    <span className={`text-xs font-semibold ${item.remark === "M" ? "text-green-700" : item.remark === "NM" ? "text-yellow-700" : "text-red-700"}`}>{item.percentage}%</span>
                    <span className="text-[11px] text-muted-foreground">{item.correct_count ?? 0} correct</span>
                    </div>
                </div>
                ))}
            </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
            <div>
                <h4 className="mb-3 font-semibold text-foreground">Best Learned</h4>
                <div className="space-y-2">
                {bestLearned.map((item, idx) => (
                    <div key={item.question_number} className="flex items-center justify-between rounded-lg bg-green-500/10 px-3 py-2 border border-green-500/20">
                    <div className="flex items-center gap-3">
                        {item.rank_label ? (<span className="text-sm font-mono text-muted-foreground">#{item.rank_label}</span>) : (<span className="text-sm font-bold text-foreground">#{idx + 1}</span>)}
                        <span className="text-sm font-medium text-foreground">Question {item.question_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{item.correct_count}/{item.total_students}</span>
                        <span className="text-sm font-bold text-green-700">{item.percentage}%</span>
                        <IconTrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    </div>
                ))}
                </div>
            </div>

            <div>
                <h4 className="mb-3 font-semibold text-foreground">Least Learned</h4>
                <div className="space-y-2">
                {leastLearned.map((item, idx) => (
                    <div key={item.question_number} className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2 border border-red-500/20">
                    <div className="flex items-center gap-3">
                        {item.rank_label ? (<span className="text-sm font-mono text-muted-foreground">#{item.rank_label}</span>) : (<span className="text-sm font-bold text-foreground">#{idx + 1}</span>)}
                        <span className="text-sm font-medium text-foreground">Question {item.question_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{item.correct_count}/{item.total_students}</span>
                        <span className="text-sm font-bold text-red-700">{item.percentage}%</span>
                        <IconTrendingDown className="h-4 w-4 text-red-500" />
                    </div>
                    </div>
                ))}
                </div>
            </div>
            </div>

            <div className="mt-6 p-3 bg-muted/50 rounded-md border border-border/50">
            <p className="text-xs text-muted-foreground"><strong>Legend:</strong> M = Mastered (≥75%) | NM = Developing (60-74%) | NTM = Struggling (&lt;60%)</p>
            </div>
        </CardContent>
        </Card>
    );
}

export default ItemEntriesOverall;
