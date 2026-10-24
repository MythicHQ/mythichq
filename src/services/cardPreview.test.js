import test from 'node:test';
import assert from 'node:assert/strict';
import { getCardPreviewSource } from './cardPreview.js';

test('accepts direct MP4 and WebM files including query strings', () => {
  assert.deepEqual(getCardPreviewSource('https://cdn.example.com/clips/movie.MP4?token=abc'), {
    type: 'video',
    src: 'https://cdn.example.com/clips/movie.MP4?token=abc',
  });
  assert.equal(getCardPreviewSource('https://cdn.example.com/clips/movie.webm')?.type, 'video');
});

test('converts supported YouTube trailer links to muted inline embeds', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=AbCdEf12345',
    'https://youtu.be/AbCdEf12345',
    'https://youtube.com/shorts/AbCdEf12345',
  ]) {
    const source = getCardPreviewSource(url);
    assert.equal(source?.type, 'youtube');
    assert.match(source?.src || '', /autoplay=1/);
    assert.match(source?.src || '', /mute=1/);
    assert.match(source?.src || '', /playsinline=1/);
  }
});

test('rejects unsupported URLs instead of treating web pages as video files', () => {
  for (const url of [
    '',
    'https://github.com/owner/repository',
    'https://github.com/owner/repository/blob/main/preview.mp4',
    'https://www.youtube.com/channel/example',
    'https://cdn.example.com/movie.mov',
    'file:///movie.mp4',
    'https://user:password@cdn.example.com/movie.mp4',
  ]) {
    assert.equal(getCardPreviewSource(url), null, url);
  }
});
