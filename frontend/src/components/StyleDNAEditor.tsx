import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StyleDNA } from '@/types'

interface StyleDNAEditorProps {
  value: Partial<StyleDNA>
  onChange: (dna: Partial<StyleDNA>) => void
}

const defaultDNA: Partial<StyleDNA> = {
  primary_font: 'Inter',
  secondary_font: 'Roboto',
  color_palette: ['#8B5CF6', '#6366F1', '#1E293B'],
  title_position: 'center',
  lower_third_style: 'minimal',
  transition_type: 'crossfade',
  background_style: 'gradient',
  intro_duration: 3,
  outro_duration: 3,
  resolution: '1920x1080',
  fps: 30,
  tts_voice: '',
  tts_speed: 1.0,
}

export function StyleDNAEditor({ value, onChange }: StyleDNAEditorProps) {
  const current = { ...defaultDNA, ...value }

  const set = (key: keyof StyleDNA, val: string | number) => {
    onChange({ ...current, [key]: val })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">Style DNA</h3>
      </div>

      {/* Fonts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primary_font">Primary Font</Label>
          <Input
            id="primary_font"
            value={current.primary_font ?? ''}
            onChange={(e) => set('primary_font', e.target.value)}
            placeholder="Inter"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondary_font">Secondary Font</Label>
          <Input
            id="secondary_font"
            value={current.secondary_font ?? ''}
            onChange={(e) => set('secondary_font', e.target.value)}
            placeholder="Roboto"
          />
        </div>
      </div>

      {/* Color Palette */}
      <div className="space-y-2">
        <Label htmlFor="color_palette">Color Palette (comma-separated hex)</Label>
        <Input
          id="color_palette"
          value={Array.isArray(current.color_palette) ? current.color_palette.join(', ') : (current.color_palette ?? '')}
          onChange={(e) => {
            const palette = e.target.value
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
            set('color_palette', palette)
          }}
          placeholder="#8B5CF6, #6366F1, #1E293B"
        />
        {Array.isArray(current.color_palette) && current.color_palette.length > 0 && (
          <div className="flex gap-2 mt-2">
            {current.color_palette.map((color, i) => (
              <div
                key={i}
                className="h-6 w-6 rounded border border-zinc-700"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Title Position */}
      <div className="space-y-2">
        <Label htmlFor="title_position">Title Position</Label>
        <Select
          value={current.title_position ?? 'center'}
          onValueChange={(v) => set('title_position', v)}
        >
          <SelectTrigger id="title_position">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lower Third */}
      <div className="space-y-2">
        <Label htmlFor="lower_third_style">Lower Third Style</Label>
        <Select
          value={current.lower_third_style ?? 'minimal'}
          onValueChange={(v) => set('lower_third_style', v)}
        >
          <SelectTrigger id="lower_third_style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minimal">Minimal</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transition */}
      <div className="space-y-2">
        <Label htmlFor="transition_type">Transition Type</Label>
        <Select
          value={current.transition_type ?? 'crossfade'}
          onValueChange={(v) => set('transition_type', v)}
        >
          <SelectTrigger id="transition_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="crossfade">Crossfade</SelectItem>
            <SelectItem value="slide">Slide</SelectItem>
            <SelectItem value="zoom">Zoom</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Background */}
      <div className="space-y-2">
        <Label htmlFor="background_style">Background Style</Label>
        <Select
          value={current.background_style ?? 'gradient'}
          onValueChange={(v) => set('background_style', v)}
        >
          <SelectTrigger id="background_style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="pattern">Pattern</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="intro_duration">Intro Duration (s)</Label>
          <Input
            id="intro_duration"
            type="number"
            min={0}
            value={current.intro_duration ?? 0}
            onChange={(e) => set('intro_duration', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="outro_duration">Outro Duration (s)</Label>
          <Input
            id="outro_duration"
            type="number"
            min={0}
            value={current.outro_duration ?? 0}
            onChange={(e) => set('outro_duration', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Resolution & FPS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="resolution">Resolution</Label>
          <Select
            value={current.resolution ?? '1920x1080'}
            onValueChange={(v) => set('resolution', v)}
          >
            <SelectTrigger id="resolution">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1920x1080">1920×1080 (Landscape)</SelectItem>
              <SelectItem value="1280x720">1280×720 (Landscape HD)</SelectItem>
              <SelectItem value="1080x1920">1080×1920 (Portrait)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fps">FPS</Label>
          <Select
            value={String(current.fps ?? 30)}
            onValueChange={(v) => set('fps', parseInt(v))}
          >
            <SelectTrigger id="fps">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="60">60</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TTS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tts_voice">TTS Voice</Label>
          <Input
            id="tts_voice"
            value={current.tts_voice ?? ''}
            onChange={(e) => set('tts_voice', e.target.value)}
            placeholder="e.g. en-US-JennyNeural"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tts_speed">TTS Speed</Label>
          <Input
            id="tts_speed"
            type="number"
            step={0.1}
            min={0.1}
            max={3.0}
            value={current.tts_speed ?? 1.0}
            onChange={(e) => set('tts_speed', parseFloat(e.target.value) || 1.0)}
          />
        </div>
      </div>
    </div>
  )
}
