import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconChevronDown, IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/loading";
import type { IItemEntriesSection } from "@/features/report/types/reports.types";

type FilterType = "all" | "mastered" | "developing" | "struggling";

interface Props {
  sections: IItemEntriesSection[];
  expandedSection: string | null;
  setExpandedSection: (id: string | null) => void;
  selectedFilter: FilterType;
  setSelectedFilter: (v: FilterType) => void;
}

export const ItemEntriesSections: React.FC<Props> = ({ sections, expandedSection, setExpandedSection, selectedFilter, setSelectedFilter }) => {
  if (!sections) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loading text="Loading section data..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => {
        const { items, metadata } = section;
        const isExpanded = expandedSection === section.section_id;

        const sortedItems = [...items].sort((a, b) => b.percentage - a.percentage);

        let filteredItems = sortedItems;
        if (selectedFilter === "mastered") filteredItems = sortedItems.filter((item) => item.remark === "M");
        else if (selectedFilter === "developing") filteredItems = sortedItems.filter((item) => item.remark === "NM");
        else if (selectedFilter === "struggling") filteredItems = sortedItems.filter((item) => item.remark === "NTM");

        const masteredCount = items.filter((item) => item.remark === "M").length;
        const developingCount = items.filter((item) => item.remark === "NM").length;
        const strugglingCount = items.filter((item) => item.remark === "NTM").length;

        const bestLearned = sortedItems.slice(0, 5);
        const leastLearned = sortedItems.slice(-5).reverse();

        return (
          <Card key={section.section_id} className="border-border bg-card/50">
            <button onClick={() => setExpandedSection(isExpanded ? null : section.section_id)} className="w-full text-left">
              <CardHeader className="cursor-pointer flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg text-foreground">{section.section_name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{metadata.students_took_exam} of {metadata.total_students} students took exam • {metadata.total_questions} questions</p>
                </div>
                <IconChevronDown className={`transition-transform text-muted-foreground ${isExpanded ? "rotate-180" : ""}`} />
              </CardHeader>
            </button>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="rounded-lg bg-background p-3 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground">Total Correct</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{metadata.section_total_correct}</p>
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

              {!isExpanded && (
                <div className="flex items-center justify-center py-6 px-4">
                  <div className="text-center text-muted-foreground text-sm">Click to expand and view detailed question analysis ({items.length} items)</div>
                </div>
              )}

              {isExpanded && (
                <div className="space-y-4">
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
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default ItemEntriesSections;
