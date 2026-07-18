import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../state/auth.dart';
import '../theme.dart';

/// Manage saved delivery addresses — list, add, edit, delete, set default.
class AddressesScreen extends StatelessWidget {
  const AddressesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final addresses = auth.addresses;

    return Scaffold(
      appBar: AppBar(title: const Text('My Addresses')),
      body: addresses.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('No saved addresses yet.\nTap + to add one.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: NwColors.muted)),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(12),
              children: addresses
                  .map((a) => Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          title: Row(
                            children: [
                              Flexible(
                                child: Text(a.name,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700)),
                              ),
                              if (a.isDefault)
                                Container(
                                  margin: const EdgeInsets.only(left: 8),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: NwColors.greenLight,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text('Default',
                                      style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: NwColors.green)),
                                ),
                            ],
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text('${a.full}\n+91 ${a.phone}',
                                style: const TextStyle(fontSize: 12.5)),
                          ),
                          isThreeLine: true,
                          trailing: PopupMenuButton<String>(
                            onSelected: (v) async {
                              if (v == 'edit') {
                                await _openForm(context, existing: a);
                              } else if (v == 'delete') {
                                await _delete(context, a);
                              }
                            },
                            itemBuilder: (_) => const [
                              PopupMenuItem(value: 'edit', child: Text('Edit')),
                              PopupMenuItem(
                                  value: 'delete', child: Text('Delete')),
                            ],
                          ),
                        ),
                      ))
                  .toList(),
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: NwColors.green,
        onPressed: () => _openForm(context),
        icon: const Icon(Icons.add),
        label: const Text('Add address'),
      ),
    );
  }

  Future<void> _delete(BuildContext context, Address a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete address?'),
        content: Text(a.full),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete',
                  style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await NutriwowApi.deleteAddress(a.id);
      if (context.mounted) await context.read<AuthState>().refreshAddresses();
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _openForm(BuildContext context, {Address? existing}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddressForm(existing: existing),
    );
  }
}

class _AddressForm extends StatefulWidget {
  final Address? existing;
  const _AddressForm({this.existing});

  @override
  State<_AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends State<_AddressForm> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.existing?.name ?? '');
  late final _phone = TextEditingController(text: widget.existing?.phone ?? '');
  late final _flat = TextEditingController(text: widget.existing?.flat ?? '');
  late final _area = TextEditingController(text: widget.existing?.area ?? '');
  late final _city = TextEditingController(text: widget.existing?.city ?? '');
  late final _state = TextEditingController(text: widget.existing?.state ?? '');
  late final _pincode =
      TextEditingController(text: widget.existing?.pincode ?? '');
  late bool _isDefault = widget.existing?.isDefault ?? false;
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [_name, _phone, _flat, _area, _city, _state, _pincode]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      if (widget.existing == null) {
        await NutriwowApi.addAddress(
          name: _name.text.trim(),
          phone: _phone.text.trim(),
          flat: _flat.text.trim(),
          area: _area.text.trim(),
          city: _city.text.trim(),
          state: _state.text.trim(),
          pincode: _pincode.text.trim(),
          isDefault: _isDefault,
        );
      } else {
        await NutriwowApi.updateAddress(
          id: widget.existing!.id,
          name: _name.text.trim(),
          phone: _phone.text.trim(),
          flat: _flat.text.trim(),
          area: _area.text.trim(),
          city: _city.text.trim(),
          state: _state.text.trim(),
          pincode: _pincode.text.trim(),
          isDefault: _isDefault,
        );
      }
      if (!mounted) return;
      await context.read<AuthState>().refreshAddresses();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required' : null;

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, bottom + 16),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.existing == null ? 'Add address' : 'Edit address',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              _field(_name, 'Full name', validator: _required),
              _field(_phone, 'Mobile number',
                  keyboard: TextInputType.phone,
                  validator: (v) => RegExp(r'^\d{10}$').hasMatch(v ?? '')
                      ? null
                      : 'Enter 10-digit number'),
              _field(_flat, 'Flat / House No, Building', validator: _required),
              _field(_area, 'Area / Street (optional)'),
              Row(children: [
                Expanded(child: _field(_city, 'City', validator: _required)),
                const SizedBox(width: 10),
                Expanded(child: _field(_state, 'State')),
              ]),
              _field(_pincode, 'Pincode',
                  keyboard: TextInputType.number,
                  validator: (v) => RegExp(r'^\d{6}$').hasMatch(v ?? '')
                      ? null
                      : 'Enter 6-digit pincode'),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                activeColor: NwColors.green,
                value: _isDefault,
                onChanged: (v) => setState(() => _isDefault = v ?? false),
                title: const Text('Set as default address',
                    style: TextStyle(fontSize: 13)),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style:
                      ElevatedButton.styleFrom(backgroundColor: NwColors.green),
                  child: Text(_saving ? 'Saving…' : 'Save address'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label,
      {TextInputType? keyboard, String? Function(String?)? validator}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: c,
        keyboardType: keyboard,
        validator: validator,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }
}
