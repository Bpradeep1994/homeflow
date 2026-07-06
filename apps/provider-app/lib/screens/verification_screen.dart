import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../api/client.dart';

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final _city = TextEditingController(text: 'Hyderabad');
  final _areas = TextEditingController();
  final _experience = TextEditingController();

  List<String> _allSkills = [];
  final _skills = <String>{};
  String? _idUrl;
  String? _photoUrl;
  final _certUrls = <String>[];
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    ApiClient.instance.catalogCategoryNames().then((names) {
      if (mounted) setState(() => _allSkills = names.cast<String>());
    });
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<String?> _pickAndUpload() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (picked == null) return null;
    final bytes = await picked.readAsBytes();
    return ApiClient.instance.uploadBytes(bytes, picked.name, picked.mimeType ?? 'image/jpeg');
  }

  Future<void> _submit() async {
    if (_idUrl == null || _skills.isEmpty || _areas.text.trim().isEmpty) {
      _toast('ID document, at least one skill and one service area are required');
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiClient.instance.submitVerification(
        idDocumentUrl: _idUrl!,
        services: _skills.toList(),
        city: _city.text.trim(),
        serviceAreas: [
          for (final a in _areas.text.split(','))
            if (a.trim().isNotEmpty) a.trim(),
        ],
        experienceYears: int.tryParse(_experience.text.trim()) ?? 0,
        photoUrl: _photoUrl,
        certificates: _certUrls,
      );
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile verification', style: TextStyle(fontWeight: FontWeight.w700))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Profile photo
          Center(
            child: InkWell(
              borderRadius: BorderRadius.circular(48),
              onTap: () async {
                final url = await _pickAndUpload();
                if (url != null) setState(() => _photoUrl = url);
              },
              child: CircleAvatar(
                radius: 44,
                backgroundColor: scheme.primaryContainer,
                backgroundImage: _photoUrl == null
                    ? null
                    : NetworkImage('${ApiClient.baseUrl}$_photoUrl'),
                child: _photoUrl == null
                    ? const Icon(Icons.add_a_photo_outlined, size: 28)
                    : null,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Center(child: Text('Profile photo (optional)', style: TextStyle(color: Colors.grey.shade600, fontSize: 12))),
          const SizedBox(height: 20),

          Text('Skills', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final skill in _allSkills)
                FilterChip(
                  label: Text(skill),
                  selected: _skills.contains(skill),
                  onSelected: (v) =>
                      setState(() => v ? _skills.add(skill) : _skills.remove(skill)),
                ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _experience,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
                labelText: 'Years of experience', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _city,
            decoration: const InputDecoration(labelText: 'City', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _areas,
            decoration: const InputDecoration(
              labelText: 'Service areas (comma separated)',
              hintText: 'Madhapur, Kondapur, Gachibowli',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 20),

          Card(
            child: ListTile(
              leading: Icon(
                _idUrl == null ? Icons.badge_outlined : Icons.check_circle,
                color: _idUrl == null ? Colors.grey : Colors.green,
              ),
              title: Text(_idUrl == null ? 'Upload ID document *' : 'ID document uploaded',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: const Text('Aadhaar, PAN or driving licence'),
              onTap: () async {
                final url = await _pickAndUpload();
                if (url != null) setState(() => _idUrl = url);
              },
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: Icon(
                _certUrls.isEmpty ? Icons.workspace_premium_outlined : Icons.check_circle,
                color: _certUrls.isEmpty ? Colors.grey : Colors.green,
              ),
              title: Text(
                  _certUrls.isEmpty
                      ? 'Add trade certificates (optional)'
                      : '${_certUrls.length} certificate(s) added',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: const Text('Training or trade licences boost customer trust'),
              onTap: () async {
                final url = await _pickAndUpload();
                if (url != null) setState(() => _certUrls.add(url));
              },
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Submit for verification'),
          ),
        ],
      ),
    );
  }
}
