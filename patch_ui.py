import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
content = re.sub(
    r'AlertCircle\n\} from \'lucide-react\';',
    "AlertCircle,\n  ChevronDown,\n  ShoppingBag\n} from 'lucide-react';",
    content
)

# 2. Add state
content = re.sub(
    r'(const \[isOnline, setIsOnline\] = useState\(true\);)',
    r'\1\n  const [showServiceModal, setShowServiceModal] = useState(false);',
    content
)

# 3. Replace select block
select_target = """<select 
            value={selectedServiceIndex}
            onChange={e => setSelectedServiceIndex(parseInt(e.target.value))}
            className="w-full p-4 bg-slate-900 text-white border-none rounded-2xl font-bold uppercase text-xs outline-none cursor-pointer"
          >
            <option value="-1">-- PILIH LAYANAN --</option>
            {SERVICES_CATALOG.map((group, gIdx) => (
              <optgroup key={gIdx} label={group.group}>
                {group.items.map((item, iIdx) => (
                  <option key={iIdx} value={flatServices.indexOf(item)}>
                    {item.name} (Rp {item.price.toLocaleString()}/{item.unit})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>"""

if select_target in content:
    replacement_btn = """<button 
            onClick={() => setShowServiceModal(true)}
            className="w-full p-4 bg-slate-900 text-white border-none rounded-2xl font-bold uppercase text-[11px] outline-none flex justify-between items-center transition-all btn-press"
          >
            <span className="flex-1 text-left truncate pr-4">
              {selectedServiceIndex === -1
                ? '-- PILIH LAYANAN --'
                : flatServices[selectedServiceIndex].name}
            </span>
            <ChevronDown size={16} className="text-slate-400 shrink-0" />
          </button>"""
    content = content.replace(select_target, replacement_btn)
else:
    print("Warning: Select target not found, trying regex fallback")
    # Using regex fallback just in case formatting is slightly off
    content = re.sub(
        r'<select[^>]*value={selectedServiceIndex}.*?</select>',
        """<button 
            onClick={() => setShowServiceModal(true)}
            className="w-full p-4 bg-slate-900 text-white border-none rounded-2xl font-bold uppercase text-[11px] outline-none flex justify-between items-center transition-all btn-press"
          >
            <span className="flex-1 text-left truncate pr-4">
              {selectedServiceIndex === -1
                ? '-- PILIH LAYANAN --'
                : flatServices[selectedServiceIndex].name}
            </span>
            <ChevronDown size={16} className="text-slate-400 shrink-0" />
          </button>""",
        content,
        flags=re.DOTALL
    )

# 4. Add the modal
modal_markup = """
        {/* Service Picker Modal */}
        {showServiceModal && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[300] bg-slate-900 flex flex-col"
          >
            <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-800 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Pilih Layanan</h2>
                <p className="text-xs text-slate-400">Silakan pilih layanan laundry Anda</p>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 btn-press"
              >
                <ShoppingBag size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {SERVICES_CATALOG.map((group, gIdx) => (
                <div key={gIdx} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-slate-800"></div>
                    <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">{group.group}</span>
                    <div className="flex-1 border-t border-slate-800"></div>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item, iIdx) => {
                      const flatIndex = flatServices.indexOf(item);
                      const isSelected = selectedServiceIndex === flatIndex;
                      const displayName = item.name
                        .replace(' (KILOAN)', '')
                        .replace('SEPRAI/SELIMUT/GORDEN - ', '')
                        .replace('BED COVER - ', '');

                      return (
                        <div
                          key={iIdx}
                          onClick={() => {
                            setSelectedServiceIndex(flatIndex);
                            setShowServiceModal(false);
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800'
                          }`}
                        >
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-white">{displayName}</h4>
                            <div className="inline-block px-3 py-1 bg-slate-900 rounded-full border border-slate-700">
                              <span className="text-xs font-bold text-blue-400">Rp {item.price.toLocaleString()}</span>
                              <span className="text-xs font-medium text-slate-400"> / {item.unit}</span>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-blue-500' : 'border-slate-600'
                          }`}>
                            {isSelected && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
"""

content = content.replace('      </AnimatePresence>\n    </div>', modal_markup + '\n      </AnimatePresence>\n    </div>')

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Applied UI patch successfully!")
