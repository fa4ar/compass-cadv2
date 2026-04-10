import React from 'react';
import { X, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Unit {
    unit: string;
}

interface MessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    unit: Unit | null;
    onSend: (message: string) => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({
    isOpen,
    onClose,
    unit,
    onSend
}) => {
    const [messageText, setMessageText] = React.useState('');

    const handleSend = () => {
        if (messageText.trim()) {
            onSend(messageText);
            setMessageText('');
            onClose();
        }
    };

    if (!isOpen || !unit) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
            <Card className="w-full max-w-md bg-zinc-900 border-zinc-800" onClick={(e) => e.stopPropagation()}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-zinc-100">
                            Отправить сообщение юниту {unit.unit}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs uppercase">Сообщение</Label>
                        <textarea 
                            className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-200 resize-none"
                            placeholder="Введите сообщение для юнита..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-500" onClick={handleSend}>
                            <Send className="w-4 h-4 mr-2" />
                            Отправить
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
