---
name: shadcn-components
description: >-
  Available shadcn/ui components in Caffeine projects: common imports,
  full component list, toast/notification patterns, and loading states.
  Load when you need to know which UI components are available or how to import them.
compatibility: opencode
---

# shadcn/ui Component Catalogue

All components live in `src/frontend/src/components/ui/` (read-only, auto-generated).
Import from `@/components/ui/<name>`.

## Common Imports

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
```

## Full Available List

Accordion, AlertDialog, Alert, AspectRatio, Avatar, Badge, Breadcrumb, Button,
Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu,
Dialog, Drawer, DropdownMenu, Form, HoverCard, InputOTP, Input, Label, Menubar,
NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable,
ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner,
Switch, Table, Tabs, Textarea, ToggleGroup, Toggle, Tooltip.

## Toast / Notifications

Use Sonner (preinstalled):

```tsx
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

// In App.tsx root:
<Toaster />;

// Usage:
toast.success("Saved successfully");
toast.error("Something went wrong");
```

## Loading States

```tsx
// Button with loading spinner
<Button disabled={isPending}>
  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
  {isPending ? "Saving..." : "Save"}
</Button>
```

Use React Query's `isPending`, `isError`, `isLoading` for data-driven states.
