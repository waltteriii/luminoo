import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Campaign, EnergyState, MONTHS, ENERGY_LABELS } from "@/types/planner";
import { cn } from "@/lib/utils";

interface CampaignEditModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaign: Campaign) => void;
}

export function CampaignEditModal({
  campaign,
  isOpen,
  onClose,
  onSave,
}: CampaignEditModalProps) {
  const [name, setName] = useState("");
  const [month, setMonth] = useState<number>(0);
  const [energyRequired, setEnergyRequired] = useState<EnergyState>("medium");

  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setMonth(campaign.month);
      setEnergyRequired(campaign.energyRequired || "medium");
    }
  }, [campaign]);

  const handleSave = () => {
    if (campaign && name.trim()) {
      onSave({
        ...campaign,
        name: name.trim(),
        month,
        energyRequired,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Edit Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-muted-foreground">
              Campaign Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter campaign name"
              className="h-10"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="month" className="text-sm text-muted-foreground">
              Month
            </Label>
            <Select
              value={month.toString()}
              onValueChange={(v) => setMonth(parseInt(v))}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((monthName, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {monthName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Energy Required
            </Label>
            <div className="flex gap-2">
              {(Object.keys(ENERGY_LABELS) as EnergyState[]).map((energy) => (
                <button
                  key={energy}
                  onClick={() => setEnergyRequired(energy)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium",
                    "transition-all duration-200 border",
                    energyRequired === energy
                      ? "border-foreground/20 bg-foreground/5"
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        energy === "high" && "bg-[hsl(var(--energy-high))]",
                        energy === "medium" && "bg-[hsl(var(--energy-medium))]",
                        energy === "low" && "bg-[hsl(var(--energy-low))]",
                        energy === "recovery" && "bg-[hsl(var(--energy-recovery))]"
                      )}
                    />
                    <span className="capitalize">{energy}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
