import { useMemo, useState } from "react";
import { ChevronsUpDown, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SkillCombobox({
  value,
  onChange,
  skills,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  skills: string[];
}) {
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const clean = skills
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\s+/g, " "));

    const unique = Array.from(new Set(clean.map((s) => s.toLowerCase()))).map(
      (lower) => clean.find((x) => x.toLowerCase() === lower) as string
    );

    return unique.sort((a, b) => a.localeCompare(b));
  }, [skills]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-11 justify-between rounded-2xl px-4 hr-btn-secondary",
            "text-slate-700 dark:text-slate-200"
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
            {value ? (
              <span className="truncate">{value}</span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                Filtrar por Skills
              </span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[320px] rounded-2xl p-0 hr-glass"
      >
        <Command>
          <CommandInput placeholder="Ex.: React, SQL, Atendimento…" />
          <CommandList>
            <CommandEmpty>Nenhuma skill encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value == null ? "opacity-100" : "opacity-0"
                  )}
                />
                Todas
              </CommandItem>
              {options.slice(0, 40).map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={(v) => {
                    onChange(v);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === opt.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
