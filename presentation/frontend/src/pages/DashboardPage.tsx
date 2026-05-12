import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconSchool,
  IconCategory,
  IconCategoryPlus,
  IconUser,
  IconWallpaper,
  IconCamera,
  IconArrowRight,
  IconPhotoSensor,
  IconNotebook,
} from "@tabler/icons-react";
import { ROUTES } from "@/lib/constants";

export default function DashboardPage() {
  const { user } = useAuth();

  const quickActions = [
    {
      title: "Grades",
      description: "Manage academic levels and grades",
      icon: IconSchool,
      href: ROUTES.GRADES,
      stats: "Organize by level",
    },
    {
      title: "Sections",
      description: "Create and organize class sections",
      icon: IconCategory,
      href: ROUTES.SECTIONS,
      stats: "Group classes",
    },
    {
      title: "Classes",
      description: "Link grades, sections, and students",
      icon: IconCategoryPlus,
      href: ROUTES.CLASSES,
      stats: "Connect all",
    },
    {
      title: "Students",
      description: "Register and manage student records",
      icon: IconUser,
      href: ROUTES.STUDENTS,
      stats: "Track students",
    },
    {
      title: "Exams",
      description: "Create and configure assessments",
      icon: IconWallpaper,
      href: ROUTES.EXAMS,
      stats: "Build exams",
    },
    {
      title: "OMR Scanning",
      description: "Scan and automatically grade sheets",
      icon: IconPhotoSensor,
      href: ROUTES.SCAN,
      stats: "Process answers",
    },
  ];

  return (
    <div className="space-y-8 p-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-lg text-muted-foreground">
          Manage your assessment workflow efficiently
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} to={action.href} className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {action.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {action.description}
                      </CardDescription>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-5 w-5 text-primary" style={{ width: '20px', height: '20px' }} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {action.stats}
                  </span>
                  <IconArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCamera className="h-5 w-5 text-primary" style={{ width: '20px', height: '20px' }} />
              Quick Scan
            </CardTitle>
            <CardDescription>Start scanning answer sheets immediately</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-primary hover:bg-primary/90">
              <Link to={ROUTES.SCAN}>Open Scanner</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconNotebook className="h-5 w-5 text-primary" style={{ width: '20px', height: '20px' }} />
              New Exam
            </CardTitle>
            <CardDescription>Create a new assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-primary hover:bg-primary/90">
              <Link to={ROUTES.EXAMS}>Create Exam</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}