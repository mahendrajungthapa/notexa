import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../notes/notes_list_screen.dart';
import '../friends/friends_screen.dart';
import '../shared/shared_screen.dart';
import '../files/files_screen.dart';
import '../settings/settings_screen.dart';
import '../../services/auth_service.dart';
import '../../services/pookie_mode.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _i = 0;
  bool _wasPookie = false;

  final List<String> _pookieEmojis = [
    '🐹',
    '🎀',
    '🌸',
    '🧸',
    '🦄',
    '💖',
    '🧁',
    '👑',
    '✨',
    '🐱',
    '🐰',
    '💛'
  ];
  final List<_PookieSprite> _sprites = [];
  Timer? _pookieTimer;

  void _startPookieEmojis() {
  _pookieTimer?.cancel();

  _pookieTimer = Timer.periodic(const Duration(milliseconds: 1200), (_) {
    if (!mounted) return;

    final pookie = context.read<PookieMode>();
    if (!pookie.enabled) return;

    final random = Random();

    late _PookieSprite sprite;

    sprite = _PookieSprite(
      id: random.nextDouble(),
      emoji: _pookieEmojis[random.nextInt(_pookieEmojis.length)],
      left: random.nextDouble(),
      size: random.nextDouble() * 24 + 18,
      duration: random.nextDouble() * 5 + 4,
      onDone: () {
        if (!mounted) return;
        setState(() {
          _sprites.removeWhere((e) => e.id == sprite.id);
        });
      },
    );

    setState(() {
      _sprites.add(sprite);
    });
  });
}

  void _stopPookieEmojis() {
    _pookieTimer?.cancel();
    _pookieTimer = null;
    if (mounted) setState(() => _sprites.clear());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final pookie = context.read<PookieMode>();
    if (pookie.enabled && !_wasPookie) {
      _startPookieEmojis();
    } else if (!pookie.enabled && _wasPookie) {
      _stopPookieEmojis();
    }
    _wasPookie = pookie.enabled;
  }

  @override
  void dispose() {
    _pookieTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authenticated = context.watch<AuthService>().isAuthenticated;
    final pookie = context.watch<PookieMode>();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (pookie.enabled && _pookieTimer == null) {
        _startPookieEmojis();
        _wasPookie = true;
      } else if (!pookie.enabled && _pookieTimer != null) {
        _stopPookieEmojis();
        _wasPookie = false;
      }
    });

    final pages = authenticated
        ? const [
            NotesListScreen(),
            SharedScreen(),
            FriendsScreen(),
            FilesScreen(),
            SettingsScreen()
          ]
        : const [NotesListScreen(), SettingsScreen()];

    final destinations = authenticated
        ? const [
            NavigationDestination(
                icon: Icon(Icons.description_outlined),
                selectedIcon: Icon(Icons.description),
                label: 'Notes'),
            NavigationDestination(
                icon: Icon(Icons.share_outlined),
                selectedIcon: Icon(Icons.share),
                label: 'Shared'),
            NavigationDestination(
                icon: Icon(Icons.people_outline),
                selectedIcon: Icon(Icons.people),
                label: 'Friends'),
            NavigationDestination(
                icon: Icon(Icons.folder_outlined),
                selectedIcon: Icon(Icons.folder),
                label: 'Files'),
            NavigationDestination(
                icon: Icon(Icons.settings_outlined),
                selectedIcon: Icon(Icons.settings),
                label: 'Settings'),
          ]
        : const [
            NavigationDestination(
                icon: Icon(Icons.description_outlined),
                selectedIcon: Icon(Icons.description),
                label: 'Notes'),
            NavigationDestination(
                icon: Icon(Icons.cloud_upload_outlined),
                selectedIcon: Icon(Icons.cloud_upload),
                label: 'Cloud'),
          ];

    if (_i >= pages.length) _i = 0;

    return Stack(
      children: [
        Scaffold(
          body: pages[_i],
          bottomNavigationBar: NavigationBar(
            selectedIndex: _i,
            onDestinationSelected: (i) => setState(() => _i = i),
            height: 65,
            backgroundColor: pookie.cardColor,
            indicatorColor: pookie.primaryLight,
            destinations: destinations,
          ),
        ),
        if (pookie.enabled)
          ..._sprites.map((s) => _PookieFloatingEmoji(sprite: s)),
      ],
    );
  }
}

class _PookieSprite {
  final double id;
  final String emoji;
  final double left;
  final double size;
  final double duration;
  final VoidCallback? onDone;

  _PookieSprite({
    required this.id,
    required this.emoji,
    required this.left,
    required this.size,
    required this.duration,
    this.onDone,
  });
}

class _PookieFloatingEmoji extends StatefulWidget {
  final _PookieSprite sprite;
  const _PookieFloatingEmoji({required this.sprite});
  @override
  State<_PookieFloatingEmoji> createState() => _PookieFloatingEmojiState();
}

class _PookieFloatingEmojiState extends State<_PookieFloatingEmoji>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _y;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();

    _ctrl = AnimationController(
      vsync: this,
      duration: Duration(seconds: widget.sprite.duration.toInt()),
    );

    _y = Tween<double>(begin: 1.0, end: -0.2).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );

    _opacity = TweenSequence([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 0.9), weight: 10),
      TweenSequenceItem(tween: Tween(begin: 0.9, end: 0.9), weight: 80),
      TweenSequenceItem(tween: Tween(begin: 0.9, end: 0.0), weight: 10),
    ]).animate(_ctrl);

    _ctrl.forward();

    // ✅ THIS is the important part
    _ctrl.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        widget.sprite.onDone?.call();
      }
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => Positioned(
        left: widget.sprite.left * size.width,
        top: _y.value * size.height,
        child: Opacity(
          opacity: _opacity.value,
          child: Text(
            widget.sprite.emoji,
            style: TextStyle(fontSize: widget.sprite.size),
          ),
        ),
      ),
    );
  }
}
