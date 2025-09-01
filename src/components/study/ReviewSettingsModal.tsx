import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Brain, Settings, Target, Clock, Zap, RotateCcw } from 'lucide-react';
import { getReviewSettings, updateReviewSettings, resetReviewSettings, type ReviewSettings } from '@/db/crud/reviewSettings';

interface ReviewSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReviewSettingsModal: React.FC<ReviewSettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentSettings = getReviewSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!settings) return;

    try {
      const success = updateReviewSettings(settings);
      if (success) {
        toast({
          title: "Configurações Salvas",
          description: "As configurações de revisão foram atualizadas com sucesso"
        });
        onOpenChange(false);
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    try {
      const success = resetReviewSettings();
      if (success) {
        loadSettings();
        toast({
          title: "Configurações Resetadas",
          description: "As configurações foram restauradas para o padrão"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível resetar as configurações",
        variant: "destructive"
      });
    }
  };

  const updateSetting = (key: keyof ReviewSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading || !settings) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>Configurações de Revisão Espaçada</span>
          </DialogTitle>
          <DialogDescription>
            Personalize o algoritmo de repetição espaçada para otimizar seu aprendizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Algoritmo Principal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Algoritmo Principal</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fator Máximo de Facilidade</Label>
                  <Slider
                    value={[settings.maxEaseFactor]}
                    onValueChange={([value]) => updateSetting('maxEaseFactor', value)}
                    min={2.0}
                    max={4.0}
                    step={0.1}
                  />
                  <p className="text-sm text-muted-foreground">{settings.maxEaseFactor.toFixed(1)}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Fator Mínimo de Facilidade</Label>
                  <Slider
                    value={[settings.minEaseFactor]}
                    onValueChange={([value]) => updateSetting('minEaseFactor', value)}
                    min={1.0}
                    max={2.0}
                    step={0.1}
                  />
                  <p className="text-sm text-muted-foreground">{settings.minEaseFactor.toFixed(1)}</p>
                </div>

                <div className="space-y-2">
                  <Label>Modificador do Fator</Label>
                  <Slider
                    value={[settings.easeFactorModifier]}
                    onValueChange={([value]) => updateSetting('easeFactorModifier', value)}
                    min={0.05}
                    max={0.3}
                    step={0.01}
                  />
                  <p className="text-sm text-muted-foreground">{settings.easeFactorModifier.toFixed(2)}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Multiplicador de Intervalo</Label>
                  <Slider
                    value={[settings.intervalMultiplier]}
                    onValueChange={([value]) => updateSetting('intervalMultiplier', value)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                  />
                  <p className="text-sm text-muted-foreground">{settings.intervalMultiplier.toFixed(1)}x</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intervalos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Intervalos de Revisão</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Intervalo Inicial (dias)</Label>
                  <Input
                    type="number"
                    value={settings.initialInterval}
                    onChange={(e) => updateSetting('initialInterval', parseInt(e.target.value))}
                    min={1}
                    max={7}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Intervalo de Graduação (dias)</Label>
                  <Input
                    type="number"
                    value={settings.graduationInterval}
                    onChange={(e) => updateSetting('graduationInterval', parseInt(e.target.value))}
                    min={2}
                    max={14}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Intervalo Fácil (dias)</Label>
                  <Input
                    type="number"
                    value={settings.easyInterval}
                    onChange={(e) => updateSetting('easyInterval', parseInt(e.target.value))}
                    min={4}
                    max={30}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Intervalo Mínimo (dias)</Label>
                  <Input
                    type="number"
                    value={settings.minInterval}
                    onChange={(e) => updateSetting('minInterval', parseInt(e.target.value))}
                    min={1}
                    max={7}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Intervalo Máximo (dias)</Label>
                  <Input
                    type="number"
                    value={settings.maxInterval}
                    onChange={(e) => updateSetting('maxInterval', parseInt(e.target.value))}
                    min={30}
                    max={3650}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multiplicadores de Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Multiplicadores de Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Multiplicador Difícil</Label>
                  <Slider
                    value={[settings.hardMultiplier]}
                    onValueChange={([value]) => updateSetting('hardMultiplier', value)}
                    min={0.3}
                    max={1.0}
                    step={0.1}
                  />
                  <p className="text-sm text-muted-foreground">{settings.hardMultiplier.toFixed(1)}x</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Multiplicador Fácil</Label>
                  <Slider
                    value={[settings.easyMultiplier]}
                    onValueChange={([value]) => updateSetting('easyMultiplier', value)}
                    min={1.0}
                    max={2.0}
                    step={0.1}
                  />
                  <p className="text-sm text-muted-foreground">{settings.easyMultiplier.toFixed(1)}x</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Multiplicador de Lapso</Label>
                  <Slider
                    value={[settings.lapseMultiplier]}
                    onValueChange={([value]) => updateSetting('lapseMultiplier', value)}
                    min={0.1}
                    max={1.0}
                    step={0.1}
                  />
                  <p className="text-sm text-muted-foreground">{settings.lapseMultiplier.toFixed(1)}x</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Sessão */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Limites de Sessão</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite Diário de Revisões</Label>
                  <Input
                    type="number"
                    value={settings.dailyReviewLimit}
                    onChange={(e) => updateSetting('dailyReviewLimit', parseInt(e.target.value))}
                    min={10}
                    max={500}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Novos Cartões por Dia</Label>
                  <Input
                    type="number"
                    value={settings.newCardsPerDay}
                    onChange={(e) => updateSetting('newCardsPerDay', parseInt(e.target.value))}
                    min={5}
                    max={100}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações Avançadas */}
          <Card>
            <CardHeader>
              <CardTitle>Recursos Avançados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Aprendizado Adaptativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajusta automaticamente baseado na sua performance
                  </p>
                </div>
                <Switch
                  checked={settings.adaptiveLearning}
                  onCheckedChange={(checked) => updateSetting('adaptiveLearning', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Intervalos Personalizados</Label>
                  <p className="text-sm text-muted-foreground">
                    Personaliza intervalos baseado no seu histórico
                  </p>
                </div>
                <Switch
                  checked={settings.personalizedIntervals}
                  onCheckedChange={(checked) => updateSetting('personalizedIntervals', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Ajuste da Curva de Esquecimento</Label>
                  <p className="text-sm text-muted-foreground">
                    Adapta baseado na sua taxa de esquecimento pessoal
                  </p>
                </div>
                <Switch
                  checked={settings.forgettingCurveAdjustment}
                  onCheckedChange={(checked) => updateSetting('forgettingCurveAdjustment', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Modo Exame</Label>
                  <p className="text-sm text-muted-foreground">
                    Acelera revisões baseado na proximidade do exame
                  </p>
                </div>
                <Switch
                  checked={settings.examModeEnabled}
                  onCheckedChange={(checked) => updateSetting('examModeEnabled', checked)}
                />
              </div>
              
              {settings.examModeEnabled && (
                <div className="space-y-2">
                  <Label>Fator de Urgência do Exame</Label>
                  <Slider
                    value={[settings.examUrgencyFactor]}
                    onValueChange={([value]) => updateSetting('examUrgencyFactor', value)}
                    min={0.3}
                    max={1.0}
                    step={0.1}
                  />
                  <p className="text-sm text-muted-foreground">{settings.examUrgencyFactor.toFixed(1)}x</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Atual */}
          <Card>
            <CardHeader>
              <CardTitle>Status Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Badge variant="outline">Algoritmo Ativo</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    SM-2 Inteligente {settings.adaptiveLearning && '+ Adaptativo'}
                  </p>
                </div>
                <div className="text-center">
                  <Badge variant={settings.examModeEnabled ? 'default' : 'secondary'}>
                    {settings.examModeEnabled ? 'Modo Exame' : 'Modo Normal'}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {settings.personalizedIntervals ? 'Personalizado' : 'Padrão'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex justify-between space-x-4">
            <Button variant="outline" onClick={handleReset} className="flex items-center space-x-2">
              <RotateCcw className="h-4 w-4" />
              <span>Restaurar Padrão</span>
            </Button>
            
            <div className="space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar Configurações
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewSettingsModal;