"use client"

import * as React from "react"
import {
  IconDashboard,
  IconCamera,
  // IconHelp,
  // IconSearch,
  // IconSettings,
  IconWallpaper,
  IconFileAnalytics,
  IconUser,
  IconCategoryPlus,
  IconSchool,
  IconCategory,
  IconPhotoSensor,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main.tsx"
// import { NavDocuments } from "@/components/nav-documents.tsx"
// import { NavSecondary } from "@/components/nav-secondary.tsx"
import { NavUser } from "@/components/nav-user.tsx"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { ROUTES } from "@/lib/constants"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMain = [
  {
    group: "Overview",
    items: [
      {
        title: "Dashboard",
        url: ROUTES.DASHBOARD,
        icon: IconDashboard,
        roles: ["teacher", "admin"],
      },
    ]
  },
  {
    group: "Assessment",
    items: [
      {
        title: "Scans",
        url: ROUTES.SCAN,
        icon: IconCamera,
        roles: ["teacher", "admin"],
      },
      {
        title: "Exams",
        url: ROUTES.EXAMS,
        icon: IconWallpaper,
        roles: ["teacher", "admin"],
      },
    ]
  },
  {
    group: "Management",
    items: [
      {
        title: "Students",
        url: ROUTES.STUDENTS,
        icon: IconUser,
        roles: ["teacher", "admin"],
      },
      {
        title: "Classes",
        url: ROUTES.CLASSES,
        icon: IconCategoryPlus,
        roles: ["admin"],
      },
      {
        title: "Grades",
        url: ROUTES.GRADES,
        icon: IconSchool,
        roles: ["admin"],
      },
      {
        title: "Sections",
        url: ROUTES.SECTIONS,
        icon: IconCategory,
        roles: ["admin"],
      },
    ]
  },
  {
    group: "Insights",
    items: [
      {
        title: "Analytics",
        url: ROUTES.REPORTS,
        icon: IconFileAnalytics,
        roles: ["teacher", "admin"],
      },
    ]
  },
  {
    group: "System",
    items: [
      {
        title: "Accounts",
        url: ROUTES.ACCOUNTS,
        icon: IconUser,
        roles: ["admin"],
      },
    ]
  },
]

// const navSecondary = [
//   {
//     title: "Settings",
//     url: "#",
//     icon: IconSettings,
//   },
//   {
//     title: "Get Help",
//     url: "#",
//     icon: IconHelp,
//   },
//   {
//     title: "Search",
//     url: "#",
//     icon: IconSearch,
//   },
// ]

// const documents = [
//   {
//     name: "Data Library",
//     url: "#",
//     icon: IconDatabase,
//   },
//   {
//     name: "Reports",
//     url: "#",
//     icon: IconReport,
//   },
// ]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  // Filter navigation items based on user role
  const filteredNavMain = React.useMemo(() => {
    if (!user) return [];
    return navMain.map(group => ({
      group: group.group,
      items: group.items.filter(item => item.roles.includes(user.role))
    })).filter(group => group.items.length > 0); // Remove empty groups
  }, [user]);

  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-transparent active:bg-transparent p-0 h-auto items-start"
            >
              <a href={ROUTES.DASHBOARD} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <IconPhotoSensor className="size-6 text-sidebar-primary shrink-0" style={{ width: '24px', height: '24px' }} />
                  <span className="text-2xl font-bold text-sidebar-primary">GradeLens</span>
                </div>
                {/* <p className="text-sm text-sidebar-foreground/60">Assessment Web-Platform</p> */}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        {/* <NavDocuments items={documents} /> */}
        {/* <NavSecondary items={navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user?.email.split('@')[0] || "User",
          email: user?.email || "",
          avatar: "",
        }} />
      </SidebarFooter>
    </Sidebar>
  )
}