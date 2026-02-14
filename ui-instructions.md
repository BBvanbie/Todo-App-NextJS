# UI/UX指示書

このファイルに、実装してほしいUI/UXの要件を書いてください。

## 1. 目的
- 個人用Todoを、**期限が近い順に上から**並べて「今やるべき」が一瞬で分かること
- **期限が近いタスクは注意、期限切れは警告**として、見落としが起きにくいこと
- 完了時に**達成感のある演出**でモチベーションが上がること

## 2. ターゲット
- 個人利用
- デバイス: **PC 50% / スマホ 50%**
- 利用シーン: **仕事・私生活など混在**
- 1日の登録数想定: **6〜15件（B）**

## 3. 画面要件
- 必須要素:
  - [x] Todo追加フォーム
  - [x] Todo一覧
  - [x] 完了切り替え
  - [x] 削除
  - [x] 期限表示（**日付のみ / 必須**）
  - [x] 未完了エリアと完了エリアの分割表示
  - [x] 未完了エリアは **期限が近い順（昇順）** で表示
  - [x] 期限ステータス表示（注意/警告）
- 任意要素:
  - [ ] フィルター（全件/未完了/完了）
  - [ ] 並び替え（追加のソート軸）
  - [ ] 件数表示（未完了件数・期限切れ件数など）
  - [ ] 完了ページ（アーカイブ/履歴）

### 完了タスクの扱い（表示ルール）
- ダッシュボード（メイン画面）では「完了エリア」に表示する
- **完了から1週間経過したタスクはメイン画面から非表示**にし、**完了ページ（履歴）へ移行**して閲覧できること  
  - 例: `completedAt` が現在日時から 7日より前 → 履歴扱い

### 編集UI
- 編集は **モーダル**で行う（参考の「タスク登録」UIに近い体験）
- 編集対象:
  - タイトル
  - 期限（日付のみ）

## 4. UX要件
- 操作感:
  - 追加・完了切替・編集・削除は **即時反映**（ViteのHMRと相性が良い）
  - スマホでも入力が詰まらない（タップ領域・フォーム導線重視）
- エラー時:
  - 表示方式は **トースト/インラインどちらでも可**（実装都合で選択可）
  - 入力バリデーション:
    - タイトル空文字は不可
    - 期限未入力は不可（期限必須）
- 削除:
  - 誤削除対策として **削除確認ダイアログ**を必ず出す
- 達成演出（完了時アニメーション）:
  - 未完了 → 完了にしたタイミングで、**画面上部に大きめの「congratulation」**を表示
  - **くす玉 + クラッカー**の演出を入れる（framer-motionなどでアニメーション）
  - 体験要件:
    - 連続完了でも邪魔になりすぎない（短時間で消える / 多重表示しない）
    - スクロール位置に関わらず「画面上部」で見える

## 5. デザイン参考コード
- ダッシュボード画面
<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Taskly Dashboard - Todo App</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#1f68f9",
                        "background-light": "#f5f6f8",
                        "background-dark": "#0a0a0b",
                        "glass-white": "rgba(255, 255, 255, 0.05)",
                        "glass-border": "rgba(255, 255, 255, 0.1)",
                    },
                    fontFamily: {
                        "display": ["Inter", "sans-serif"]
                    },
                    borderRadius: {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                },
            },
        }
    </script>
<style>
        .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .neon-glow {
            box-shadow: 0 0 15px rgba(31, 104, 249, 0.3);
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex overflow-hidden">
<!-- Sidebar Navigation -->
<aside class="w-64 border-r border-glass-border bg-background-light dark:bg-background-dark flex flex-col h-screen shrink-0 relative z-20">
<div class="p-6 flex items-center gap-3">
<div class="bg-primary size-10 rounded-lg flex items-center justify-center neon-glow">
<span class="material-symbols-outlined text-white">check_circle</span>
</div>
<h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Taskly</h1>
</div>
<nav class="flex-1 px-4 mt-4 space-y-2">
<a class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary border border-primary/20" href="#">
<span class="material-symbols-outlined">assignment</span>
<span class="font-medium text-sm">Tasks</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-glass-white transition-all duration-200" href="#">
<span class="material-symbols-outlined">calendar_today</span>
<span class="font-medium text-sm">Calendar</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-glass-white transition-all duration-200" href="#">
<span class="material-symbols-outlined">monitoring</span>
<span class="font-medium text-sm">Stats</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-glass-white transition-all duration-200" href="#">
<span class="material-symbols-outlined">settings</span>
<span class="font-medium text-sm">Settings</span>
</a>
</nav>
<div class="p-6">
<div class="glass-card rounded-2xl p-4 relative overflow-hidden group">
<div class="absolute -top-12 -right-12 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all"></div>
<p class="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Pro Plan</p>
<p class="text-xs text-slate-400 leading-relaxed mb-4">Unlock advanced analytics and team sync.</p>
<button class="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors neon-glow">Upgrade Now</button>
</div>
</div>
<div class="px-6 py-6 border-t border-glass-border">
<div class="flex items-center gap-3">
<div class="size-10 rounded-full overflow-hidden bg-slate-700">
<img class="w-full h-full object-cover" data-alt="User profile avatar of John Doe" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDq4Zda9-_Q473D7tCi6Z8hvRsJbt1e7dyPB-Vn3vveNZanXlWwfysaWpjEmlUUTURHx-DxH9QjGa-cIo5yFPU3XsnXwPqWsvhlu1doLHZaqSf7hLbgjn0cP8aJquS6kDTd_uai6nDtBFrJrScEAghiN7AneywJast1inNi91ZRW1_qa05mAZ5P-uTehFSuutdGCWJe3YLBkaWOoGAWAAgXwHesxkQJGPRKMYkC-n1IYUwV2Ml-BTxGcoywetUs4v-C32fwTp939P8C"/>
</div>
<div class="flex flex-col">
<p class="text-sm font-semibold">John Doe</p>
<p class="text-xs text-slate-500">Product Designer</p>
</div>
</div>
</div>
</aside>
<!-- Main Content Area -->
<main class="flex-1 flex flex-col min-w-0 overflow-y-auto bg-background-light dark:bg-background-dark">
<!-- Header -->
<header class="h-20 flex items-center justify-between px-10 border-b border-glass-border sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
<div class="flex items-center gap-6">
<div class="relative w-80">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
<input class="w-full bg-glass-white border border-glass-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all" placeholder="Search tasks..." type="text"/>
</div>
</div>
<div class="flex items-center gap-4">
<div class="text-right mr-4 hidden md:block">
<p class="text-sm font-semibold text-slate-900 dark:text-white">Monday, Oct 24</p>
<p class="text-xs text-slate-500">4 tasks remaining</p>
</div>
<button class="p-2.5 rounded-xl bg-glass-white border border-glass-border text-slate-400 hover:text-primary transition-colors">
<span class="material-symbols-outlined">notifications</span>
</button>
<button class="flex items-center gap-2 bg-primary px-5 py-2.5 rounded-xl text-white font-semibold text-sm hover:bg-blue-600 transition-all neon-glow shrink-0">
<span class="material-symbols-outlined text-[1.2rem]">add</span>
<span>New Task</span>
</button>
</div>
</header>
<!-- Content -->
<div class="p-10 max-w-6xl mx-auto w-full space-y-10">
<!-- Hero Progress Card -->
<section class="glass-card rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden group">
<div class="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
<div class="relative z-10 flex flex-col gap-2">
<span class="px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full w-fit">Today's Goal</span>
<h2 class="text-3xl font-bold text-slate-900 dark:text-white mt-2">Today's Progress</h2>
<p class="text-slate-500 font-medium">You're almost there! Keep up the great momentum.</p>
</div>
<div class="relative z-10 mt-8 md:mt-0 flex flex-col items-center md:items-end gap-3">
<div class="relative flex items-center justify-center">
<svg class="w-32 h-32 transform -rotate-90">
<circle class="text-slate-200 dark:text-slate-800" cx="64" cy="64" fill="transparent" r="56" stroke="currentColor" stroke-width="8"></circle>
<circle class="text-primary" cx="64" cy="64" fill="transparent" r="56" stroke="currentColor" stroke-dasharray="351.85" stroke-dashoffset="140.74" stroke-linecap="round" stroke-width="8"></circle>
</svg>
<div class="absolute inset-0 flex flex-col items-center justify-center">
<span class="text-2xl font-bold text-slate-900 dark:text-white">60%</span>
<span class="text-[10px] uppercase font-bold text-slate-500">Done</span>
</div>
</div>
</div>
</section>
<!-- Task List Section -->
<section class="space-y-6">
<div class="flex items-center justify-between">
<div class="flex items-center gap-2">
<button class="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/20">All</button>
<button class="px-5 py-2 rounded-xl bg-glass-white border border-glass-border text-slate-500 hover:text-white text-sm font-semibold transition-all">Work</button>
<button class="px-5 py-2 rounded-xl bg-glass-white border border-glass-border text-slate-500 hover:text-white text-sm font-semibold transition-all">Personal</button>
</div>
<button class="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm font-medium">
<span class="material-symbols-outlined text-base">filter_list</span>
                        Sort by: Priority
                    </button>
</div>
<!-- Task Cards -->
<div class="grid gap-4">
<!-- Task 1 -->
<div class="glass-card hover:bg-white/5 transition-all duration-300 p-5 rounded-2xl flex items-center gap-6 border-l-4 border-l-red-500 group">
<div class="flex items-center justify-center cursor-pointer">
<div class="size-6 rounded-md border-2 border-slate-600 dark:border-slate-700 flex items-center justify-center group-hover:border-primary transition-colors">
<span class="material-symbols-outlined text-primary text-lg opacity-0 group-hover:opacity-40">check</span>
</div>
</div>
<div class="flex-1 min-w-0">
<div class="flex items-center gap-3 mb-1">
<h3 class="font-bold text-slate-900 dark:text-white truncate">Design System Update</h3>
<span class="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">High</span>
</div>
<div class="flex items-center gap-4 text-xs text-slate-500">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-sm">business_center</span>
<span>Work</span>
</div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-sm">schedule</span>
<span>Due 2:00 PM</span>
</div>
</div>
</div>
<div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-2 text-slate-500 hover:text-primary"><span class="material-symbols-outlined text-xl">edit_square</span></button>
<button class="p-2 text-slate-500 hover:text-red-500"><span class="material-symbols-outlined text-xl">delete</span></button>
</div>
</div>
<!-- Task 2 -->
<div class="glass-card hover:bg-white/5 transition-all duration-300 p-5 rounded-2xl flex items-center gap-6 border-l-4 border-l-amber-500 group">
<div class="flex items-center justify-center cursor-pointer">
<div class="size-6 rounded-md border-2 border-slate-600 dark:border-slate-700 flex items-center justify-center group-hover:border-primary transition-colors">
<span class="material-symbols-outlined text-primary text-lg opacity-0 group-hover:opacity-40">check</span>
</div>
</div>
<div class="flex-1 min-w-0">
<div class="flex items-center gap-3 mb-1">
<h3 class="font-bold text-slate-900 dark:text-white truncate">Meeting with Sarah</h3>
<span class="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Medium</span>
</div>
<div class="flex items-center gap-4 text-xs text-slate-500">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-sm">groups</span>
<span>Work</span>
</div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-sm">schedule</span>
<span>Due 4:30 PM</span>
</div>
</div>
</div>
<div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-2 text-slate-500 hover:text-primary"><span class="material-symbols-outlined text-xl">edit_square</span></button>
<button class="p-2 text-slate-500 hover:text-red-500"><span class="material-symbols-outlined text-xl">delete</span></button>
</div>
</div>
<!-- Task 3 -->
<div class="glass-card hover:bg-white/5 transition-all duration-300 p-5 rounded-2xl flex items-center gap-6 border-l-4 border-l-emerald-500 group opacity-75">
<div class="flex items-center justify-center cursor-pointer">
<div class="size-6 rounded-md border-2 border-slate-600 dark:border-slate-700 flex items-center justify-center bg-primary border-primary">
<span class="material-symbols-outlined text-white text-lg">check</span>
</div>
</div>
<div class="flex-1 min-w-0">
<div class="flex items-center gap-3 mb-1">
<h3 class="font-bold text-slate-500 line-through truncate">Buy groceries</h3>
<span class="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Low</span>
</div>
<div class="flex items-center gap-4 text-xs text-slate-500">
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-sm">person</span>
<span>Personal</span>
</div>
<div class="flex items-center gap-1">
<span class="material-symbols-outlined text-sm">check_circle</span>
<span>Completed</span>
</div>
</div>
</div>
<div class="flex gap-2">
<button class="p-2 text-slate-500 hover:text-red-500"><span class="material-symbols-outlined text-xl">delete</span></button>
</div>
</div>
</div>
</section>
</div>
<!-- Float Decoration -->
<div class="fixed bottom-10 right-10 flex flex-col gap-4 pointer-events-none">
<div class="w-24 h-24 bg-primary/20 rounded-full blur-3xl"></div>
</div>
</main>
<!-- Background Elements -->
<div class="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
<div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]"></div>
<div class="absolute top-[40%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]"></div>
</div>
</body></html>

- タスク登録
<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Add New Task - TaskMaster</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#1f68f9",
                        "background-light": "#f5f6f8",
                        "background-dark": "#0f1623",
                    },
                    fontFamily: {
                        "display": ["Inter"]
                    },
                    borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
                },
            },
        }
    </script>
<style>
        body {
            font-family: 'Inter', sans-serif;
        }
        .glass-effect {
            backdrop-filter: blur(12px);
            background-color: rgba(15, 22, 35, 0.8);
        }
        .neon-glow {
            box-shadow: 0 0 15px rgba(31, 104, 249, 0.4);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 10px;
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen font-display">
<!-- Blurred Dashboard Background Simulation -->
<div class="fixed inset-0 z-0 overflow-hidden opacity-40 blur-md pointer-events-none">
<div class="max-w-7xl mx-auto p-8 grid grid-cols-12 gap-6">
<!-- Sidebar placeholder -->
<div class="col-span-2 space-y-4">
<div class="h-8 w-32 bg-slate-700 rounded-lg"></div>
<div class="space-y-2">
<div class="h-10 bg-slate-800 rounded-lg w-full"></div>
<div class="h-10 bg-primary/20 rounded-lg w-full"></div>
<div class="h-10 bg-slate-800 rounded-lg w-full"></div>
</div>
</div>
<!-- Main content placeholder -->
<div class="col-span-10 space-y-6">
<div class="flex justify-between items-center">
<div class="h-10 w-48 bg-slate-700 rounded-lg"></div>
<div class="h-10 w-10 bg-slate-700 rounded-full"></div>
</div>
<div class="grid grid-cols-3 gap-4">
<div class="h-32 bg-slate-800 rounded-xl border border-slate-700"></div>
<div class="h-32 bg-slate-800 rounded-xl border border-slate-700"></div>
<div class="h-32 bg-slate-800 rounded-xl border border-slate-700"></div>
</div>
<div class="h-64 bg-slate-800 rounded-xl border border-slate-700 w-full"></div>
</div>
</div>
</div>
<!-- Modal Overlay -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 glass-effect">
<!-- Center Card -->
<div class="bg-[#1b1f27] w-full max-w-[600px] rounded-xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
<!-- Header -->
<div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-background-dark/50">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-primary">add_task</span>
<h2 class="text-xl font-bold tracking-tight text-white">Add New Task</h2>
</div>
<button class="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
<span class="material-symbols-outlined">close</span>
</button>
</div>
<!-- Form Body -->
<div class="px-6 py-6 overflow-y-auto custom-scrollbar space-y-6">
<!-- Task Title -->
<div class="space-y-2">
<label class="text-sm font-semibold text-slate-400 uppercase tracking-wider">Task Title</label>
<input class="w-full bg-[#0f1623] border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-lg" placeholder="What needs to be done?" type="text"/>
</div>
<!-- Description -->
<div class="space-y-2">
<label class="text-sm font-semibold text-slate-400 uppercase tracking-wider">Description</label>
<textarea class="w-full bg-[#0f1623] border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none" placeholder="Add more details about this task..." rows="3"></textarea>
</div>
<!-- Due Date & Time -->
<div class="space-y-3">
<label class="text-sm font-semibold text-slate-400 uppercase tracking-wider">Due Date &amp; Time</label>
<div class="flex flex-wrap gap-2 mb-3">
<button class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium neon-glow transition-all">Today</button>
<button class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-all border border-slate-700">Tomorrow</button>
<button class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-all border border-slate-700">Next Week</button>
<button class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-all border border-slate-700 flex items-center gap-1">
<span class="material-symbols-outlined text-sm">calendar_today</span>
                            Custom
                        </button>
</div>
<div class="grid grid-cols-2 gap-4">
<div class="relative">
<span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-xl">event</span>
<input class="w-full bg-[#0f1623] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-primary/50 focus:border-primary transition-all [color-scheme:dark]" type="date"/>
</div>
<div class="relative">
<span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-xl">schedule</span>
<input class="w-full bg-[#0f1623] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-primary/50 focus:border-primary transition-all [color-scheme:dark]" type="time"/>
</div>
</div>
</div>
<!-- Category Selection -->
<div class="space-y-3">
<label class="text-sm font-semibold text-slate-400 uppercase tracking-wider">Category</label>
<div class="grid grid-cols-4 gap-3">
<button class="flex flex-col items-center justify-center p-3 rounded-lg border border-primary bg-primary/10 text-primary transition-all group">
<span class="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform">laptop_mac</span>
<span class="text-xs font-medium">Work</span>
</button>
<button class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all group">
<span class="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform">person</span>
<span class="text-xs font-medium">Personal</span>
</button>
<button class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all group">
<span class="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform">shopping_cart</span>
<span class="text-xs font-medium">Shopping</span>
</button>
<button class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all group">
<span class="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform">favorite</span>
<span class="text-xs font-medium">Health</span>
</button>
</div>
</div>
<!-- Priority Toggle -->
<div class="flex items-center justify-between p-4 bg-[#0f1623] rounded-lg border border-slate-800">
<div class="flex items-center gap-3">
<div class="p-2 bg-red-500/10 rounded-lg">
<span class="material-symbols-outlined text-red-500">priority_high</span>
</div>
<div>
<p class="text-white font-medium">High Priority</p>
<p class="text-xs text-slate-500">Mark this task as urgent</p>
</div>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input checked="" class="sr-only peer" type="checkbox" value=""/>
<div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
</div>
<!-- Footer Action -->
<div class="p-6 border-t border-slate-800 bg-background-dark/50">
<button class="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg neon-glow transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98]">
<span class="material-symbols-outlined">rocket_launch</span>
                    Create Task
                </button>
<p class="text-center text-slate-500 text-xs mt-4">
                    Press <kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Esc</kbd> to cancel or <kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Enter</kbd> to save
                </p>
</div>
</div>
</div>
<!-- Hidden background element for theme continuity -->
<div class="fixed bottom-4 right-4 z-10 opacity-20">
<div class="w-64 h-64 bg-primary rounded-full blur-[100px]"></div>
</div>
</body></html>

## 6. レスポンシブ要件
- モバイル:
  - 片手操作優先
  - 主要操作（追加/編集/完了/削除）ボタンはタップしやすいサイズ（目安: 44px相当）
  - モーダルは画面サイズに合わせて高さ可変 + スクロール可能
- デスクトップ:
  - ダッシュボードと登録フォームは別物（モーダルで登録/編集）
  - 未完了/完了は同一画面で見えるが、完了は“控えめ”にして主役は未完了
  - 一覧の1行は情報密度を上げすぎず、余白を確保

## 7. アクセシビリティ要件
- キーボード操作対応:
  - Tab移動が破綻しない
  - モーダル表示時はフォーカストラップ（モーダル外へフォーカスが逃げない）
  - Escでモーダル閉じる
- コントラスト比を確保（ダーク/ライト両方）
- フォーム要素にラベル付与（視覚的にラベルが無い場合もaria-label等で担保）
- ボタン/アイコンはaria属性で意味が分かるようにする

## 8. 実装上の制約
- 使用してよいライブラリ:
  - Tailwind CSS: 可
  - shadcn/ui: 可（Dialog, Button, Input, Badge など推奨）
  - framer-motion: 可（達成演出、表示/非表示アニメ用）
- 禁止事項:
  - なし（ただし、5のデザイン参考コードは絶対に改変しない）

## 9. 優先順位
1. **期限が近い順に並び、注意/警告が直感的に分かる（見落とし防止）**
2. CRUD操作（追加/編集/完了/削除）の分かりやすさ・迷いにくさ
3. 達成演出（congratulation + くす玉 + クラッカー）の“気持ちよさ”
4. モバイルでの入力しやすさ（片手操作/タップ領域）
5. 見た目の演出（ガラス/ネオン/余白/タイポ）

## 10. 参考
- 参考サイト/画像URL:
  - （未入力）
- 真似したい点:
  - ガラス調のカード
  - neon-glowのアクセント
  - 余白とタイポが効いたモダンUI
  - モーダル中心の登録/編集UX
- 避けたい点:
  - 情報過多でゴチャつくUI
  - 警告/注意が弱く、期限を見落とす設計
  - 完了タスクがいつまでもメイン画面を占領する状態（1週間で履歴へ移行）
