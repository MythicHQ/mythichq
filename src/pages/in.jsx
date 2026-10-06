import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  ChevronRight,
  Film,
  Flame,
  Globe2,
  Info,
  Search,
  Sparkles,
} from "lucide-react";
import {
  fetchPublicMovies,
  getPublicMovieSections,
} from "../services/movieCatalog";
import MovieCard from "../components/MovieCard";
import SkeletonCard from "../components/SkeletonCard";
import heroBackdrop from "../assets/toxicbd.jpg";
const discoveryLinks = [
  { label: "Trending", to: "/trending", tone: "red" },
  { label: "Top Rated", to: "/top-rated", tone: "gold" },
  { label: "Upcoming", to: "/upcoming", tone: "blue" },
  { label: "Hidden Gems", to: "/discovery", tone: "violet" },
  { label: "Popular", to: "/movies?category=popular", tone: "green" },
  { label: "Kannada Movies", to: "/movies?language=Kannada", tone: "amber" },
  {
    label: "International",
    to: "/movies?language=International",
    tone: "cyan",
  },
  { label: "Action", to: "/genre/28", tone: "orange" },
  { label: "Comedy", to: "/genre/35", tone: "pink" },
  { label: "Drama", to: "/genre/18", tone: "indigo" },
  { label: "Thriller", to: "/genre/53", tone: "slate" },
];
const features = [
  {
    icon: <Sparkles size={21} />,
    title: "Discover Something New",
    text: "Find trending titles, hidden favorites, and stories that deserve a place on your list.",
  },
  {
    icon: <Search size={21} />,
    title: "Powerful Movie Search",
    text: "Find the right movie in seconds with fast and relevant movie search.",
  },
  {
    icon: <Globe2 size={21} />,
    title: "Explore Every Genre",
    text: "Browse genres, languages, ratings, moods, and different movie categories.",
  },
  {
    icon: <Film size={21} />,
    title: "Built for Movie Lovers",
    text: "A focused cinematic space designed to help you discover what to watch next.",
  },
];
const welcomeStyles = `
  .welcome-page {
    --welcome-bg: #08090d;
    --welcome-surface: #11141c;
    --welcome-line: rgba(255,255,255,.09);
    --welcome-muted: #a7adba;
    min-height: 100vh;
    overflow: hidden;
    color: #f7f8fb;
    background: var(--welcome-bg);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .welcome-page *, .welcome-page *::before, .welcome-page *::after { box-sizing: border-box; }
  .welcome-page button, .welcome-page a { -webkit-tap-highlight-color: transparent; }
  .welcome-header {
    position: fixed;
    inset: 0 0 auto;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 76px;
    padding: 0 clamp(20px, 6vw, 88px);
    border-bottom: 1px solid transparent;
    transition: background .25s ease, border-color .25s ease, backdrop-filter .25s ease;
  }
  .welcome-header.is-scrolled {
    border-color: var(--welcome-line);
    background: rgba(8,9,13,.84);
    backdrop-filter: blur(18px);
  }
  .welcome-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #fff;
    font-size: 1.25rem;
    font-weight: 900;
    letter-spacing: -.7px;
    text-decoration: none;
  }
  .welcome-brand > span:last-child > span { color: #ff4257; }
  .welcome-brand-mark {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 1px solid rgba(255,72,91,.34);
    border-radius: 10px;
    color: #ff5366;
    background: linear-gradient(145deg, rgba(255,67,86,.2), rgba(255,67,86,.04));
    box-shadow: 0 5px 20px rgba(229,9,20,.14);
  }
  .welcome-nav { display: flex; align-items: center; gap: 12px; }
  .welcome-sign-in {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    padding: 0 19px;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 999px;
    color: #fff;
    background: rgba(255,255,255,.055);
    font-size: .82rem;
    font-weight: 750;
    text-decoration: none;
    transition: .2s ease;
  }
  .welcome-sign-in:hover { border-color: #ff5366; background: rgba(255,67,86,.12); }
  .welcome-hero {
    position: relative;
    display: flex;
    min-height: min(820px, 100svh);
    align-items: center;
    padding: 120px clamp(24px, 10vw, 150px) 92px;
    isolation: isolate;
    background-color: #090a0e;
    background-image: var(--welcome-hero-image);
    background-position: center 35%;
    background-size: cover;
  }
  .welcome-hero::before {
    position: absolute;
    z-index: -1;
    inset: 0;
    content: "";
    background: linear-gradient(90deg, rgba(5,6,9,.96) 0%, rgba(5,6,9,.77) 40%, rgba(5,6,9,.18) 100%),
      linear-gradient(0deg, #08090d 0%, rgba(8,9,13,.08) 54%, rgba(8,9,13,.45) 100%);
  }
  .welcome-hero-overlay { position: absolute; z-index: -1; inset: 0; box-shadow: inset 0 -90px 100px -90px #08090d; }
  .welcome-hero-content { width: min(100%, 680px); }
  .welcome-eyebrow, .welcome-section-kicker {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px;
    color: #ff6475;
    font-size: .72rem;
    font-weight: 850;
    letter-spacing: 1.8px;
    text-transform: uppercase;
  }
  .welcome-eyebrow::before { width: 24px; height: 2px; content: ""; background: #ff4257; }
  .welcome-hero h1 {
    max-width: 700px;
    margin: 0;
    color: #fff;
    font-size: clamp(3rem, 7.8vw, 6.6rem);
    font-weight: 950;
    letter-spacing: -.075em;
    line-height: .98;
    text-wrap: balance;
    text-shadow: 0 8px 38px rgba(0,0,0,.52);
  }
  .welcome-hero h1 em, .welcome-discovery-copy h2 em { color: #ff5366; font-style: normal; }
  .welcome-hero-copy {
    max-width: 540px;
    margin: 22px 0 0;
    color: rgba(245,247,251,.78);
    font-size: clamp(.95rem, 1.3vw, 1.08rem);
    line-height: 1.75;
  }
  .welcome-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
  .welcome-primary-button, .welcome-ghost-button {
    display: inline-flex;
    min-height: 50px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 0 22px;
    border-radius: 9px;
    font: inherit;
    font-size: .88rem;
    font-weight: 850;
    text-decoration: none;
    cursor: pointer;
    transition: transform .2s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease;
  }
  .welcome-primary-button {
    border: 1px solid #ff3d52;
    color: #fff;
    background: linear-gradient(135deg, #f22c43, #c90e27);
    box-shadow: 0 10px 28px rgba(229,9,35,.27);
  }
  .welcome-primary-button:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(229,9,35,.4); }
  .welcome-ghost-button { border: 1px solid rgba(255,255,255,.22); color: #fff; background: rgba(255,255,255,.07); }
  .welcome-ghost-button:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.5); background: rgba(255,255,255,.12); }
  .welcome-guest-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 22px 0 0;
    padding: 0;
    border: 0;
    color: #fff;
    background: transparent;
    font: inherit;
    font-size: .82rem;
    font-weight: 750;
    cursor: pointer;
  }
  .welcome-guest-link:hover { color: #ff8794; }
  .welcome-guest-note { display: flex; align-items: center; gap: 9px; margin: 10px 0 0; color: rgba(235,239,247,.6); font-size: .72rem; }
  .welcome-pulse { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #54d69a; box-shadow: 0 0 12px rgba(84,214,154,.8); }
  .welcome-section { width: min(100% - 48px, 1280px); margin: 0 auto; padding: 78px 0; }
  .welcome-trending { padding-top: 44px; }
  .welcome-section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 25px; }
  .welcome-section-heading .welcome-section-kicker { margin-bottom: 9px; letter-spacing: 1.2px; }
  .welcome-section-heading h2, .welcome-discovery-copy h2, .welcome-guest-card h2 {
    margin: 0;
    color: #fff;
    font-size: clamp(1.7rem, 3.4vw, 2.5rem);
    font-weight: 900;
    letter-spacing: -.055em;
    line-height: 1.08;
  }
  .welcome-section-link { display: inline-flex; align-items: center; gap: 5px; padding: 8px 0; border: 0; color: #cbd0da; background: transparent; font: inherit; font-size: .82rem; font-weight: 750; cursor: pointer; }
  .welcome-section-link:hover { color: #ff6475; }
  .welcome-top-ten-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 18px; }
  .welcome-top-ten-grid > .movie-card { width: auto; min-width: 0; }
  .welcome-empty-state { grid-column: 1 / -1; display: grid; min-height: 160px; place-content: center; justify-items: center; gap: 12px; border: 1px solid var(--welcome-line); border-radius: 14px; color: var(--welcome-muted); background: var(--welcome-surface); }
  .welcome-empty-state p { margin: 0; }
  .welcome-features { padding-top: 70px; padding-bottom: 88px; }
  .welcome-section-heading.centered { justify-content: center; text-align: center; }
  .welcome-section-heading.centered .welcome-section-kicker { justify-content: center; }
  .welcome-feature-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 32px; }
  .welcome-feature-card {
    min-height: 205px;
    padding: 24px 22px;
    border: 1px solid var(--welcome-line);
    border-radius: 14px;
    background: linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018));
    transition: transform .2s ease, border-color .2s ease, background .2s ease;
  }
  .welcome-feature-card:hover { transform: translateY(-4px); border-color: rgba(255,83,102,.4); background: linear-gradient(145deg, rgba(255,83,102,.09), rgba(255,255,255,.02)); }
  .welcome-feature-icon { display: grid; width: 44px; height: 44px; place-items: center; margin-bottom: 21px; border: 1px solid rgba(255,83,102,.25); border-radius: 12px; color: #ff6979; background: rgba(255,83,102,.1); }
  .welcome-feature-card h3 { margin: 0 0 9px; color: #fff; font-size: .98rem; font-weight: 850; }
  .welcome-feature-card p { margin: 0; color: var(--welcome-muted); font-size: .8rem; line-height: 1.65; }
  .welcome-discovery-band { border-top: 1px solid var(--welcome-line); border-bottom: 1px solid var(--welcome-line); background: radial-gradient(ellipse at 85% 45%, rgba(139,35,56,.18), transparent 42%), #0d0f15; }
  .welcome-discovery-inner { display: grid; width: min(100% - 48px, 1280px); grid-template-columns: .85fr 1.15fr; align-items: center; gap: clamp(32px, 7vw, 100px); margin: 0 auto; padding: 78px 0; }
  .welcome-discovery-copy h2 { font-size: clamp(2rem, 4.2vw, 3.4rem); }
  .welcome-discovery-copy > p:last-child { max-width: 430px; margin: 17px 0 0; color: var(--welcome-muted); font-size: .9rem; line-height: 1.7; }
  .welcome-discovery-links { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .welcome-discovery-link { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: 8px; padding: 0 13px; border: 1px solid var(--welcome-line); border-radius: 9px; color: #e9ebf1; background: rgba(255,255,255,.035); font: inherit; font-size: .76rem; font-weight: 750; text-align: left; cursor: pointer; transition: .2s ease; }
  .welcome-discovery-link:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.26); background: rgba(255,255,255,.075); }
  .welcome-discovery-link svg { flex: 0 0 auto; color: #ff6475; }
  .welcome-guest-section { width: min(100% - 48px, 1280px); margin: 0 auto; padding: 78px 0; }
  .welcome-guest-card { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: clamp(24px, 4vw, 42px); border: 1px solid rgba(255,83,102,.22); border-radius: 18px; background: radial-gradient(ellipse at 0% 0%, rgba(229,9,35,.14), transparent 45%), linear-gradient(135deg, #151720, #101219); box-shadow: 0 22px 60px rgba(0,0,0,.2); }
  .welcome-guest-icon { display: grid; width: 56px; height: 56px; place-items: center; border: 1px solid rgba(255,83,102,.3); border-radius: 15px; color: #ff687a; background: rgba(255,83,102,.11); }
  .welcome-guest-card .welcome-section-kicker { margin-bottom: 9px; }
  .welcome-guest-card h2 { font-size: clamp(1.5rem, 3vw, 2rem); }
  .welcome-guest-copy { max-width: 660px; margin: 10px 0 0; color: var(--welcome-muted); font-size: .85rem; line-height: 1.7; }
  .welcome-guest-copy strong { color: #fff; }
  .welcome-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 22px; padding: 28px clamp(24px, 6vw, 88px); border-top: 1px solid var(--welcome-line); background: #07080b; }
  .welcome-footer-brand > p { margin: 8px 0 0; color: #858b98; font-size: .72rem; }
  .welcome-footer .welcome-brand { font-size: 1.05rem; }
  .welcome-footer .welcome-brand-mark { width: 30px; height: 30px; }
  .welcome-footer-links { display: flex; flex-wrap: wrap; gap: 20px; }
  .welcome-footer-links a { color: #a7adba; font-size: .76rem; font-weight: 650; text-decoration: none; }
  .welcome-footer-links a:hover { color: #fff; }
  .welcome-copyright { width: 100%; margin: 0; padding-top: 17px; border-top: 1px solid rgba(255,255,255,.06); color: #6e7480; font-size: .68rem; }
  @media (min-width: 1500px) { .welcome-hero { min-height: 860px; } }
  @media (max-width: 1000px) {
    .welcome-top-ten-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .welcome-feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .welcome-discovery-inner { grid-template-columns: 1fr; gap: 28px; }
    .welcome-discovery-copy > p:last-child { max-width: 650px; }
  }
  @media (max-width: 640px) {
    .welcome-header { height: 62px; padding: 0 17px; }
    .welcome-brand { gap: 8px; font-size: 1.08rem; }
    .welcome-brand-mark { width: 31px; height: 31px; }
    .welcome-sign-in { min-height: 36px; padding: 0 15px; font-size: .76rem; }
    .welcome-hero { min-height: 720px; min-height: max(680px, 100svh); align-items: flex-end; padding: 120px 23px 84px; background-position: 58% center; }
    .welcome-hero::before { background: linear-gradient(0deg, #08090d 0%, rgba(8,9,13,.86) 24%, rgba(8,9,13,.2) 68%, rgba(8,9,13,.35) 100%), linear-gradient(90deg, rgba(5,6,9,.3), transparent); }
    .welcome-hero-content { padding-bottom: 10px; }
    .welcome-eyebrow { margin-bottom: 12px; font-size: .63rem; letter-spacing: 1.3px; }
    .welcome-hero h1 { font-size: clamp(2.85rem, 13vw, 4.6rem); letter-spacing: -.07em; }
    .welcome-hero-copy { max-width: 460px; margin-top: 16px; font-size: .9rem; line-height: 1.65; }
    .welcome-hero-actions { gap: 9px; margin-top: 23px; }
    .welcome-primary-button, .welcome-ghost-button { min-height: 46px; padding: 0 16px; font-size: .8rem; }
    .welcome-guest-link { margin-top: 19px; }
    .welcome-guest-note { max-width: 340px; font-size: .67rem; line-height: 1.45; }
    .welcome-section, .welcome-guest-section { width: min(100% - 34px, 1280px); padding: 54px 0; }
    .welcome-trending { padding-top: 30px; }
    .welcome-section-heading { align-items: flex-end; margin-bottom: 19px; }
    .welcome-section-heading h2 { font-size: 1.65rem; }
    .welcome-section-heading .welcome-section-kicker { font-size: .62rem; }
    .welcome-section-link { flex: 0 0 auto; font-size: .73rem; }
    .welcome-top-ten-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px 10px; }
    .welcome-feature-grid { grid-template-columns: 1fr; gap: 10px; margin-top: 24px; }
    .welcome-feature-card { display: grid; min-height: 0; grid-template-columns: 42px 1fr; column-gap: 13px; padding: 17px; }
    .welcome-feature-icon { width: 42px; height: 42px; grid-row: span 2; margin: 0; }
    .welcome-feature-card h3 { align-self: end; margin-bottom: 5px; font-size: .9rem; }
    .welcome-feature-card p { font-size: .75rem; }
    .welcome-discovery-inner { width: min(100% - 34px, 1280px); gap: 23px; padding: 55px 0; }
    .welcome-discovery-copy h2 { font-size: 2.1rem; }
    .welcome-discovery-copy > p:last-child { font-size: .82rem; }
    .welcome-discovery-links { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .welcome-discovery-link { min-height: 44px; padding: 0 10px; font-size: .7rem; }
    .welcome-guest-card { grid-template-columns: 1fr; gap: 16px; padding: 22px; }
    .welcome-guest-icon { width: 48px; height: 48px; }
    .welcome-guest-card > .welcome-primary-button { justify-self: start; }
    .welcome-footer { padding: 24px 19px; }
    .welcome-footer-links { gap: 13px 17px; }
    .welcome-footer-links a { font-size: .7rem; }
  }
  /* Cinematic landing-page refresh */
  .welcome-header {
    height: 72px;
    padding-inline: clamp(22px, 5.5vw, 84px);
    background: linear-gradient(180deg, rgba(4,5,8,.82), rgba(4,5,8,.16));
  }
  .welcome-nav { gap: clamp(14px, 2.4vw, 34px); }
  .welcome-nav-link { color: rgba(245,247,251,.72); font-size: .78rem; font-weight: 700; text-decoration: none; transition: color .2s ease; }
  .welcome-nav-link:hover { color: #fff; }
  .welcome-sign-in { min-height: 38px; padding-inline: 18px; border-color: rgba(255,255,255,.24); background: rgba(12,14,19,.5); }
  .welcome-hero {
    min-height: min(900px, 100svh);
    padding: 132px clamp(28px, 9vw, 142px) 108px;
    background-position: 58% 36%;
  }
  .welcome-hero::before {
    background:
      radial-gradient(ellipse at 78% 45%, rgba(255,42,65,.13), transparent 38%),
      linear-gradient(90deg, rgba(4,5,8,.97) 0%, rgba(4,5,8,.81) 38%, rgba(4,5,8,.16) 77%, rgba(4,5,8,.08) 100%),
      linear-gradient(0deg, #08090d 0%, rgba(8,9,13,.04) 42%, rgba(8,9,13,.48) 100%);
  }
  .welcome-hero-content { position: relative; z-index: 2; width: min(58%, 710px); }
  .welcome-hero-badge { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 17px; padding: 7px 11px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; color: rgba(255,255,255,.85); background: rgba(8,9,13,.45); font-size: .58rem; font-weight: 800; letter-spacing: 1.05px; backdrop-filter: blur(10px); }
  .welcome-hero-badge > span { width: 7px; height: 7px; border-radius: 50%; background: #ff4058; box-shadow: 0 0 12px #ff4058; }
  .welcome-eyebrow { margin-bottom: 13px; color: #ff7382; font-size: .68rem; letter-spacing: 1.55px; }
  .welcome-hero h1 { max-width: 700px; font-size: clamp(2.65rem, 5.8vw, 5.5rem); letter-spacing: -.07em; line-height: .96; }
  .welcome-hero h1 em { display: block; margin-top: .04em; color: #ff435a; }
  .welcome-hero-copy { max-width: 490px; margin-top: 19px; color: rgba(245,247,251,.72); }
  .welcome-hero-actions { margin-top: 28px; }
  .welcome-primary-button { min-height: 52px; padding-inline: 24px; border-radius: 7px; }
  .welcome-ghost-button { min-height: 52px; padding-inline: 20px; border-radius: 7px; }
  .welcome-hero-feature {
    position: absolute;
    z-index: 2;
    right: clamp(32px, 8vw, 120px);
    bottom: 118px;
    width: clamp(210px, 24vw, 310px);
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.22);
    border-radius: 13px;
    background: rgba(12,14,18,.72);
    box-shadow: 0 24px 70px rgba(0,0,0,.45);
    backdrop-filter: blur(15px);
    transform: rotate(2deg);
    transition: transform .3s ease;
  }
  .welcome-hero-feature:hover { transform: rotate(0) translateY(-5px); }
  .welcome-feature-art { position: relative; display: flex; min-height: 220px; flex-direction: column; justify-content: space-between; padding: 14px; background-position: center; background-size: cover; isolation: isolate; }
  .welcome-feature-art::before { position: absolute; z-index: -1; inset: 0; content: ""; background: linear-gradient(180deg,rgba(3,4,6,.55),rgba(3,4,6,.1) 38%,rgba(3,4,6,.88)); }
  .welcome-feature-art-label { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 6px 8px; border: 1px solid rgba(255,255,255,.18); border-radius: 6px; color: #fff; background: rgba(8,9,13,.38); font-size: .56rem; font-weight: 850; letter-spacing: 1px; }
  .welcome-feature-art-caption > span { display: block; margin-bottom: 7px; color: #ff9aa5; font-size: .55rem; font-weight: 850; letter-spacing: 1.5px; }
  .welcome-feature-art-caption strong { color: #fff; font-size: 1.5rem; font-weight: 900; letter-spacing: -.055em; line-height: 1; }
  .welcome-feature-foot { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; color: #e7e9ef; font-size: .65rem; font-weight: 750; }
  .welcome-feature-foot span { display: inline-flex; align-items: center; gap: 7px; }
  .welcome-feature-foot span svg, .welcome-feature-foot > svg { color: #ff6577; }
  .welcome-cinema-strip { display: flex; min-height: 58px; align-items: center; justify-content: center; gap: clamp(12px, 2vw, 27px); padding: 10px 24px; border-top: 1px solid rgba(255,255,255,.07); border-bottom: 1px solid rgba(255,255,255,.07); color: rgba(255,255,255,.75); background: #0d0f14; }
  .welcome-cinema-strip > span { color: #ff6678; font-size: .6rem; font-weight: 900; letter-spacing: 1.4px; white-space: nowrap; }
  .welcome-cinema-strip i { width: 3px; height: 3px; flex: 0 0 3px; border-radius: 50%; background: #707582; }
  .welcome-cinema-strip b { font-size: .7rem; font-weight: 700; white-space: nowrap; }
  .welcome-cinema-strip button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 0 7px 12px; border: 0; color: #fff; background: transparent; font: inherit; font-size: .68rem; font-weight: 800; white-space: nowrap; cursor: pointer; }
  .welcome-cinema-strip button:hover { color: #ff7685; }
  .welcome-trending { padding-top: 72px; }
  .welcome-section-heading h2 { font-size: clamp(2rem, 3.6vw, 2.9rem); letter-spacing: -.065em; }
  .welcome-top-ten-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 18px; }
  .welcome-top-ten-grid > .movie-card { position: relative; overflow: visible; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
  .welcome-top-ten-grid .movie-poster-wrapper { overflow: hidden; border: 1px solid rgba(255,255,255,.1); border-radius: 10px; background: #13151b; box-shadow: 0 13px 28px rgba(0,0,0,.25); transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease; }
  .welcome-top-ten-grid > .movie-card:hover .movie-poster-wrapper { transform: translateY(-6px); border-color: rgba(255,83,102,.55); box-shadow: 0 20px 38px rgba(0,0,0,.38), 0 0 25px rgba(255,50,74,.12); }
  .welcome-top-ten-grid .movie-poster-img { display: block; width: 100%; aspect-ratio: 2 / 3; object-fit: cover; }
  .welcome-top-ten-grid .movie-rank-badge { top: auto; bottom: 12px; left: 12px; min-width: 30px; height: 30px; border: 1px solid rgba(255,255,255,.25); border-radius: 8px; background: rgba(7,8,11,.82); backdrop-filter: blur(8px); }
  .welcome-top-ten-grid .movie-card-info { padding: 11px 2px 0; }
  .welcome-top-ten-grid .movie-card-header { display: flex; align-items: center; justify-content: space-between; }
  .welcome-top-ten-grid .movie-card-title { margin: 7px 0 0; color: #f6f7fa; font-size: .82rem; font-weight: 750; }
  .welcome-trending, .welcome-features { position: relative; }
  .welcome-features { width: 100%; max-width: none; padding: 86px max(24px, calc((100vw - 1280px) / 2)) 94px; background: linear-gradient(180deg, #0b0d12, #101219 45%, #0b0d12); }
  .welcome-feature-grid { gap: 14px; }
  .welcome-feature-card { position: relative; overflow: hidden; min-height: 220px; padding: 25px; border-radius: 12px; background: linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.012)); }
  .welcome-feature-card::after { position: absolute; right: -35px; bottom: -55px; width: 130px; height: 130px; border: 1px solid rgba(255,83,102,.12); border-radius: 50%; content: ""; }
  .welcome-feature-icon { width: 46px; height: 46px; }
  .welcome-discovery-band { background: radial-gradient(ellipse at 88% 45%, rgba(142,28,48,.23), transparent 40%), #0b0d12; }
  .welcome-discovery-inner { width: min(100% - 48px, 1280px); }
  .welcome-discovery-band { scroll-margin-top: 75px; }
  .welcome-guest-card { position: relative; overflow: hidden; }
  .welcome-guest-card::after { position: absolute; top: -80px; right: 12%; width: 250px; height: 250px; border: 1px solid rgba(255,91,109,.1); border-radius: 50%; content: ""; pointer-events: none; }
  .welcome-footer { padding-top: 34px; }
  @media (prefers-reduced-motion: reduce) {
    .welcome-page *, .welcome-page *::before, .welcome-page *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
  }
  @media (max-width: 1000px) {
    .welcome-hero-content { width: min(68%, 650px); }
    .welcome-hero-feature { right: 34px; bottom: 88px; width: 220px; }
    .welcome-feature-art { min-height: 174px; }
    .welcome-top-ten-grid { grid-template-columns: repeat(4, minmax(0,1fr)); }
    .welcome-cinema-strip { justify-content: flex-start; overflow-x: auto; }
  }
  @media (max-width: 760px) {
    .welcome-hero-content { width: min(100%, 650px); }
    .welcome-hero-feature { display: none; }
  }
  @media (max-width: 640px) {
    .welcome-header { height: 62px; padding-inline: 17px; }
    .welcome-nav { gap: 12px; }
    .welcome-nav-link { display: none; }
    .welcome-hero { min-height: max(750px, 100svh); padding: 110px 22px 80px; background-position: 60% center; }
    .welcome-hero::before { background: linear-gradient(0deg, #08090d 0%, rgba(8,9,13,.92) 24%, rgba(8,9,13,.25) 72%, rgba(8,9,13,.4) 100%), linear-gradient(90deg, rgba(5,6,9,.28), transparent); }
    .welcome-hero-content { width: 100%; }
    .welcome-hero-badge { margin-bottom: 17px; font-size: .55rem; letter-spacing: 1px; }
    .welcome-hero h1 { font-size: clamp(2.3rem, 9.5vw, 3.25rem); letter-spacing: -.065em; line-height: .98; }
    .welcome-hero-copy { max-width: 420px; margin-top: 15px; font-size: .82rem; line-height: 1.6; }
    .welcome-hero-feature { top: 92px; right: 21px; bottom: auto; width: 126px; border-radius: 9px; transform: rotate(3deg); }
    .welcome-feature-art { min-height: 150px; padding: 8px; }
    .welcome-feature-art-label { gap: 4px; padding: 5px; font-size: .42rem; letter-spacing: .6px; }
    .welcome-feature-art-label svg { width: 10px; }
    .welcome-feature-art-caption > span { font-size: .4rem; letter-spacing: .8px; }
    .welcome-feature-art-caption strong { font-size: .95rem; }
    .welcome-feature-foot { padding: 8px; font-size: .48rem; }
    .welcome-feature-foot span { gap: 4px; }
    .welcome-feature-foot svg { width: 11px; }
    .welcome-cinema-strip { min-height: 50px; gap: 13px; padding-inline: 17px; }
    .welcome-cinema-strip > span { font-size: .52rem; }
    .welcome-cinema-strip b { font-size: .65rem; }
    .welcome-cinema-strip button { display: none; }
    .welcome-section, .welcome-guest-section { width: calc(100% - 34px); padding: 52px 0; }
    .welcome-trending { padding-top: 45px; }
    .welcome-top-ten-grid { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 18px 12px; }
    .welcome-top-ten-grid .movie-card-title { font-size: .76rem; }
    .welcome-features { width: 100%; padding: 58px 17px 65px; }
    .welcome-feature-card { min-height: 0; }
    .welcome-discovery-inner { width: calc(100% - 34px); padding: 56px 0; }
    .welcome-guest-section { padding-block: 54px; }
  }
`;
const WelcomePage = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  /* * Header scroll effect */ useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  /* * Load public movie data */ useEffect(() => {
    let active = true;
    const loadMovies = async () => {
      try {
        const movies = await fetchPublicMovies();
        if (!active) return;
        const sections = getPublicMovieSections(movies);
        setTrendingMovies(sections?.trending?.slice(0, 10) || []);
      } catch (error) {
        console.error("Failed to load public movies:", error);
        if (active) {
          setTrendingMovies([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadMovies();
    return () => {
      active = false;
    };
  }, []);
  const getStarted = () => navigate("/login");
  const handleDiscoveryClick = () => navigate("/login", {
    state: { message: "Please log in to explore movie categories." },
  });
  /* * Render */ return (
    <div className="welcome-page">
      <style>{welcomeStyles}</style>
      {" "}
      {/* ========================= HEADER ========================== */}{" "}
      <header className={`welcome-header ${isScrolled ? "is-scrolled" : ""}`}>
        {" "}
        <Link to="/" className="welcome-brand" aria-label="MythicHQ home">
          {" "}
          <span className="welcome-brand-mark">
            {" "}
            <Film size={17} />{" "}
          </span>{" "}
          <span>
            {" "}
            Mythic<span>HQ</span>{" "}
          </span>{" "}
        </Link>{" "}
        <nav className="welcome-nav" aria-label="Welcome navigation">
          <a href="#trending" className="welcome-nav-link">Trending</a>
          <a href="#discover" className="welcome-nav-link">Discover</a>
          {" "}
          <Link to="/login" className="welcome-sign-in">
            {" "}
            Sign In{" "}
          </Link>{" "}
        </nav>{" "}
      </header>{" "}
      <main>
        {" "}
        {/* ========================= HERO ========================== */}{" "}
        <section
          className="welcome-hero"
          style={{ "--welcome-hero-image": `url(${heroBackdrop})` }}
        >
          {" "}
          <div className="welcome-hero-overlay" />{" "}
          <div className="welcome-hero-content">
            {" "}
            <div className="welcome-hero-badge"><span /> YOUR NEXT FAVORITE STARTS HERE</div>
            <p className="welcome-eyebrow">
              {" "}
              Unlimited movies &amp; TV shows{" "}
            </p>{" "}
            <h1>
              {" "}
              Welcome to <em>Cineverse</em>{" "}
            </h1>{" "}
            <p className="welcome-hero-copy">
              {" "}
              Discover endless stories, explore new worlds, and find your next
              favorite movie. A cinematic destination built for movie
              lovers.{" "}
            </p>{" "}
            <div className="welcome-hero-actions">
              {" "}
              <button
                type="button"
                className="welcome-primary-button"
                onClick={getStarted}
              >
                {" "}
                Get Started <ArrowRight size={17} />{" "}
              </button>{" "}
              <Link className="welcome-ghost-button" to="/about">
                {" "}
                <Info size={17} /> More Info{" "}
              </Link>{" "}
            </div>{" "}
            <button
              type="button"
              className="welcome-guest-link"
              onClick={() => navigate("/movies?category=all")}
            >
              {" "}
              Continue as Guest <ArrowRight size={15} />{" "}
            </button>{" "}
            <p className="welcome-guest-note">
              {" "}
              <span className="welcome-pulse" /> Browse freely. Sign in only
              when you want to save or review.{" "}
            </p>{" "}
          </div>{" "}
          <aside className="welcome-hero-feature" aria-label="Discover MythicHQ">
            <div className="welcome-feature-art" style={{ backgroundImage: `url(${heroBackdrop})` }}>
              <span className="welcome-feature-art-label"><Film size={13} /> MYTHICHQ DISCOVERY</span>
              <div className="welcome-feature-art-caption">
                <span>THE NEXT GREAT STORY</span>
                <strong>Find your<br />kind of movie.</strong>
              </div>
            </div>
            <div className="welcome-feature-foot">
              <span><Sparkles size={15} /> Curated for movie lovers</span>
              <ArrowRight size={16} />
            </div>
          </aside>
        </section>{" "}
        <div className="welcome-cinema-strip" aria-label="MythicHQ discovery categories">
          <span>MORE TO EXPLORE</span><i />
          <b>Trending</b><i /><b>Top Rated</b><i /><b>Hidden Gems</b><i /><b>New Releases</b>
          <button type="button" onClick={() => navigate("/movies?category=all")}>Browse the collection <ArrowRight size={14} /></button>
        </div>
        {/* ========================= TRENDING MOVIES ========================== */}{" "}
        <section className="welcome-section welcome-trending" id="trending">
          {" "}
          <div className="welcome-section-heading">
            {" "}
            <div>
              {" "}
              <p className="welcome-section-kicker">
                {" "}
                <Flame size={15} /> Worth a look{" "}
              </p>{" "}
              <h2> Trending Now </h2>{" "}
            </div>{" "}
            <button
              type="button"
              className="welcome-section-link"
              onClick={() => navigate("/trending")}
            >
              {" "}
              View all <ChevronRight size={17} />{" "}
            </button>{" "}
          </div>{" "}
          <div className="welcome-top-ten-grid">
            {" "}
            {loading ? (
              <SkeletonCard count={4} />
            ) : trendingMovies.length > 0 ? (
              trendingMovies.map((movie, index) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  rank={index + 1}
                  showTitle
                  showMetadata
                  showWatchlist={false}
                  onMovieClick={() => navigate("/login")}
                />
              ))
            ) : (
              <div className="welcome-empty-state">
                {" "}
                <Film size={28} />{" "}
                <p>No trending movies available right now.</p>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </section>{" "}
        {/* ========================= FEATURES ========================== */}{" "}
        <section className="welcome-section welcome-features">
          {" "}
          <div className="welcome-section-heading centered">
            {" "}
            <div>
              {" "}
              <p className="welcome-section-kicker">
                {" "}
                The MythicHQ point of view{" "}
              </p>{" "}
              <h2> More than a watchlist. </h2>{" "}
            </div>{" "}
          </div>{" "}
          <div className="welcome-feature-grid">
            {" "}
            {features.map((feature) => (
              <article className="welcome-feature-card" key={feature.title}>
                {" "}
                <div className="welcome-feature-icon">
                  {" "}
                  {feature.icon}{" "}
                </div>{" "}
                <h3> {feature.title} </h3> <p> {feature.text} </p>{" "}
              </article>
            ))}{" "}
          </div>{" "}
        </section>{" "}
        {/* ========================= DISCOVERY ========================== */}{" "}
        <section className="welcome-discovery-band" id="discover">
          {" "}
          <div className="welcome-discovery-inner">
            {" "}
            <div className="welcome-discovery-copy">
              {" "}
              <p className="welcome-section-kicker">
                {" "}
                Find your next favorite{" "}
              </p>{" "}
              <h2>
                {" "}
                Choose a mood. <br /> <em>Follow the story.</em>{" "}
              </h2>{" "}
              <p>
                {" "}
                From pulse-quickening thrillers to films that stay with you,
                your next great watch starts with a single choice.{" "}
              </p>{" "}
            </div>{" "}
            <div className="welcome-discovery-links">
              {" "}
              {discoveryLinks.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={handleDiscoveryClick}
                  className={`welcome-discovery-link ${item.tone}`}
                >
                  {" "}
                  <span> {item.label} </span> <ArrowRight size={15} />{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>{" "}
        </section>{" "}
        {/* ========================= GUEST SECTION ========================== */}{" "}
        <section className="welcome-guest-section">
          {" "}
          <div className="welcome-guest-card">
            {" "}
            <div className="welcome-guest-icon">
              {" "}
              <Bookmark size={22} />{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="welcome-section-kicker">
                {" "}
                Start without friction{" "}
              </p>{" "}
              <h2> Just Want to Explore? </h2>{" "}
              <p className="welcome-guest-copy">
                {" "}
                <strong> Your next favorite story is waiting. </strong> Create
                your MythicHQ account to explore movies, save your watchlist, and
                share reviews.{" "}
              </p>{" "}
            </div>{" "}
            <button
              type="button"
              className="welcome-primary-button"
              onClick={getStarted}
            >
              {" "}
              Get Started <ArrowRight size={17} />{" "}
            </button>{" "}
          </div>{" "}
        </section>{" "}
      </main>{" "}
      {/* ========================= FOOTER ========================== */}{" "}
      <footer className="welcome-footer">
        {" "}
        <div className="welcome-footer-brand">
          {" "}
          <Link to="/" className="welcome-brand">
            {" "}
            <span className="welcome-brand-mark">
              {" "}
              <Film size={17} />{" "}
            </span>{" "}
            <span>
              {" "}
              Mythic<span>HQ</span>{" "}
            </span>{" "}
          </Link>{" "}
          <p> Stories worth finding. </p>{" "}
        </div>{" "}
        <div className="welcome-footer-links">
          {" "}
          <Link to="/help"> Support </Link> <Link to="/contact"> Contact </Link>{" "}
          <Link to="/help"> Privacy </Link> <Link to="/help"> Terms </Link>{" "}
          <a
            href="https://www.instagram.com/themythichq/?__pwa=1"
            target="_blank"
            rel="noopener noreferrer"
          >
            {" "}
            Instagram{" "}
          </a>{" "}
        </div>{" "}
        <p className="welcome-copyright">
          {" "}
          © 2026 MythicHQ. All rights reserved.{" "}
        </p>{" "}
      </footer>{" "}
    </div>
  );
};
export default WelcomePage;
