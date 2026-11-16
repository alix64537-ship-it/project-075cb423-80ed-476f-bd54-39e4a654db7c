import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onLogin: (user: { name: string; phone: string }) => void;
};

export function LoginDialog({ open, onOpenChange, onLogin }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+7 ");
  const valid = name.trim().length > 1 && phone.replace(/\D/g, "").length >= 11;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Вход в Сауда</DialogTitle>
          <DialogDescription>Подавайте объявления, сохраняйте избранное и общайтесь с продавцами.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            onLogin({ name: name.trim(), phone: phone.trim() });
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="login-name">Как вас зовут</Label>
            <Input id="login-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Айдана" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-phone">Номер телефона</Label>
            <Input id="login-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 700 000 00 00" className="h-11" />
          </div>
          <Button type="submit" disabled={!valid} className="h-11 w-full rounded-xl">
            Войти
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Это демо-версия: код из SMS не требуется.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
