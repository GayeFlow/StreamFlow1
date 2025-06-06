import React from "react";
import { Edit, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

type SeriesActionMenuProps = {
  onEdit: any;
  onDelete: any;
  onSeasons: any;
  serieTitle: string;
};

export default function SeriesActionMenu({ onEdit, onDelete, onSeasons }: SeriesActionMenuProps) {
  return (
    <div className="flex flex-col bg-gray-900 rounded shadow-lg min-w-[140px] border border-gray-700 z-50">
      <Button variant="ghost" className="justify-start" onClick={onEdit}>
        <Edit className="h-4 w-4 mr-2" /> Éditer
      </Button>
      <Button variant="ghost" className="justify-start" onClick={onSeasons}>
        <Layers className="h-4 w-4 mr-2" /> Gérer saisons
      </Button>
      <Button variant="destructive" className="justify-start" onClick={onDelete}>
        <Trash2 className="h-4 w-4 mr-2" /> Supprimer
      </Button>
    </div>
  );
}
