"use client"

import { type Icon } from "@tabler/icons-react"
import { Link, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavMain({
    items,
}: {
    items: {
        group: string
        items: {
        title: string
        url: string
        icon?: Icon
        }[]
    }[]
}) {
    const location = useLocation()
    
    return (
        <>
        {items.map((group) => (
            <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase text-sidebar-foreground/60">
                {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu className="space-y-2">
                {group.items.map((item) => {
                    const isActive = location.pathname === item.url
                    return (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                        tooltip={item.title} 
                        asChild
                        className={cn(
                            "px-4 py-3 h-auto transition-colors",
                            isActive 
                            ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                        >
                        <Link to={item.url} className="flex items-center gap-3">
                            {item.icon && <item.icon className="size-5 shrink-0" style={{ width: '20px', height: '20px' }} />}
                            <span className="text-base font-medium">{item.title}</span>
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    )
                })}
                </SidebarMenu>
            </SidebarGroupContent>
            </SidebarGroup>
        ))}
        </>
    )
}