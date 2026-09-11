import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'auth/auth_provider.dart';
import 'auth/offline_queue.dart';

String apiBase() {
  const fromEnv = String.fromEnvironment('PRAMAN_API', defaultValue: '');
  if (fromEnv.isNotEmpty) return fromEnv;
  return 'http://10.223.184.213:3001/api';
}

void main() {
  runApp(const PramanApp());
}

class PramanApp extends StatelessWidget {
  const PramanApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => OfflineQueue()),
      ],
      child: Builder(
        builder: (context) {
          final authed = context.watch<AuthProvider>().accessToken != null;
          final router = GoRouter(
            initialLocation: authed ? '/home' : '/login',
            routes: [
              GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
              GoRoute(path: '/home', builder: (c, s) => const HomeScreen()),
            ],
            redirect: (c, s) {
              final loggedIn =
                  c.read<AuthProvider>().accessToken != null;
              if (!loggedIn && s.matchedLocation != '/login') return '/login';
              if (loggedIn && s.matchedLocation == '/login') return '/home';
              return null;
            },
          );
          return MaterialApp.router(
            title: 'Praman Inspection',
            theme: ThemeData(
              colorSchemeSeed: const Color(0xFF1C1917),
              useMaterial3: true,
            ),
            routerConfig: router,
          );
        },
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String? _error;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Praman — Inspector Login')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: auth.loginIdController,
              decoration: const InputDecoration(labelText: 'User ID (e.g. pmu1)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: auth.passwordController,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () async {
                      final navigator = GoRouter.of(context);
                      setState(() {
                        _busy = true;
                        _error = null;
                      });
                      final ok = await auth.login(
                        auth.loginIdController.text.trim(),
                        auth.passwordController.text,
                      );
                      if (!mounted) return;
                      setState(() => _busy = false);
                      if (ok) {
                        navigator.go('/home');
                      } else {
                        setState(() => _error = 'Login failed. Check ID/password.');
                      }
                    },
              child: _busy
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Login'),
            ),
          ],
        ),
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final queue = context.watch<OfflineQueue>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Praman — Inspections'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await auth.logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('User: ${auth.userId ?? '-'} (${auth.role?.name ?? '-'})',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text('API: ${apiBase()}'),
            FutureBuilder<int>(
              future: queue.pendingCount(),
              builder: (c, s) =>
                  Text('Offline queue: ${s.data ?? '…'} pending'),
            ),
            const SizedBox(height: 24),
            const Text(
              'Inspection checklist, live evidence capture and VC calls '
              'plug into this shell via lib/inspection and lib/vc services.',
            ),
          ],
        ),
      ),
    );
  }
}
