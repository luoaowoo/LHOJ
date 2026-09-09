import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { ArrowDown, ArrowUp, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { fetchHomepageConfig, saveCarouselSlides } from '../lib/homepage';
import type { CarouselSlide } from '../lib/homepage';
import { hydroAssetUrl } from '../lib/endpoint';
import ConfirmDialog from './ConfirmDialog';
import { ErrorBox, FullPageLoader } from './StateBox';

function blankSlide(): CarouselSlide {
  return { id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, image: '', link: '', title: '' };
}

export default function CarouselAdminPanel() {
  const [slides, setSlides] = useState<CarouselSlide[] | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<CarouselSlide | null>(null);

  const load = useCallback(() => {
    setSlides(null); setError(''); setSaved(false);
    void fetchHomepageConfig()
      .then((config) => setSlides(config.slides))
      .catch((cause) => setError(cause instanceof Error ? cause.message : '轮播图配置加载失败。'));
  }, []);
  useEffect(load, [load]);

  const update = (id: string, patch: Partial<CarouselSlide>) => {
    setSaved(false);
    setSlides((current) => current?.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)) ?? current);
  };

  const move = (index: number, delta: number) => {
    setSaved(false);
    setSlides((current) => {
      if (!current) return current;
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    if (!slides) return;
    const cleaned = slides.filter((slide) => slide.image.trim());
    setSaving(true); setError(''); setSaved(false);
    try {
      await saveCarouselSlides(cleaned);
      setSlides(cleaned);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '轮播图保存失败。');
    } finally {
      setSaving(false);
    }
  };

  if (!slides && !error) return <FullPageLoader />;
  if (!slides) return <ErrorBox message={error} onRetry={load} />;

  return (
    <Box>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {saved ? <Alert severity="success" sx={{ mb: 2 }}>轮播图已保存。</Alert> : null}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>首页轮播图</Typography>
        <Button size="small" startIcon={<RefreshCw size={16} />} onClick={load}>刷新</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        配置保存在 Hydro 域公告中，所有访客可见。图片链接可填写完整网址，或以 / 开头的 Hydro 站内文件路径。
      </Typography>

      <Stack spacing={2}>
        {slides.map((slide, index) => (
          <Paper key={slide.id} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 96, height: 54, flexShrink: 0, borderRadius: 1.5, overflow: 'hidden',
                  border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover',
                  display: 'grid', placeItems: 'center',
                }}
              >
                {slide.image.trim() ? (
                  <Box
                    component="img"
                    src={slide.image.startsWith('/') ? hydroAssetUrl(slide.image) ?? slide.image : slide.image}
                    alt=""
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">预览</Typography>
                )}
              </Box>
              <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  fullWidth size="small" label="图片链接"
                  value={slide.image}
                  onChange={(event) => update(slide.id, { image: event.target.value })}
                />
                <TextField
                  fullWidth size="small" label="点击跳转（站内如 /contest/xxx，站外填完整网址，留空则不跳转）"
                  value={slide.link}
                  onChange={(event) => update(slide.id, { link: event.target.value })}
                />
                <TextField
                  fullWidth size="small" label="标题（用于无障碍描述）"
                  value={slide.title}
                  onChange={(event) => update(slide.id, { title: event.target.value })}
                />
              </Stack>
              <Stack spacing={0.5}>
                <IconButton aria-label="上移" size="small" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></IconButton>
                <IconButton aria-label="下移" size="small" disabled={index === slides.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></IconButton>
                <IconButton aria-label="删除" size="small" color="error" onClick={() => setRemoving(slide)}><Trash2 size={16} /></IconButton>
              </Stack>
            </Stack>
          </Paper>
        ))}
        {!slides.length ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography color="text.secondary">还没有轮播图，点击下方「添加一张」开始配置。</Typography>
          </Paper>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button startIcon={<Plus size={16} />} onClick={() => { setSaved(false); setSlides((current) => [...(current ?? []), blankSlide()]); }}>
          添加一张
        </Button>
        <Button variant="contained" startIcon={<Save size={16} />} disabled={saving} onClick={() => void save()}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </Stack>

      <ConfirmDialog
        open={Boolean(removing)}
        title="删除这张轮播图？"
        content="删除后需要点击「保存」才会生效。"
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          setSaved(false);
          setSlides((current) => current?.filter((slide) => slide.id !== removing?.id) ?? current);
          setRemoving(null);
        }}
      />
    </Box>
  );
}
