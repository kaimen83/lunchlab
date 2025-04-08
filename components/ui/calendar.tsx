"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DayPickerBase } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn("flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0"),
        month: cn("space-y-4"),
        caption: cn("flex justify-center pt-1 relative items-center"),
        caption_label: cn("text-sm font-medium"),
        nav: cn("space-x-1 flex items-center"),
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: cn("absolute left-1"),
        nav_button_next: cn("absolute right-1"),
        table: cn("w-full border-collapse space-y-1"),
        head_row: cn("flex"),
        head_cell: cn(
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]"
        ),
        row: cn("flex w-full mt-2"),
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
        ),
        day_today: cn("bg-accent text-accent-foreground"),
        day_outside: cn("text-muted-foreground opacity-50"),
        day_disabled: cn("text-muted-foreground opacity-50"),
        day_range_middle: cn(
          "aria-selected:bg-accent aria-selected:text-accent-foreground"
        ),
        day_hidden: cn("invisible"),
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
