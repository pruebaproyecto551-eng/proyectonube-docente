import Swal from 'sweetalert2';

// Instancia personalizada con estilos y tipografía modernos de Tailwind
const CustomSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-3xl p-6 font-sans shadow-2xl border border-slate-100',
    title: 'text-lg font-black text-slate-900 tracking-tight',
    htmlContainer: 'text-xs text-slate-600 leading-relaxed mt-1',
    confirmButton:
      'px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition mx-1 cursor-pointer',
    cancelButton:
      'px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition mx-1 cursor-pointer',
  },
  buttonsStyling: false,
});

export const alerts = {
  // Confirmación de eliminación destructiva
  async confirmDelete(
    title = '¿Eliminar este registro?',
    text = 'Esta acción no se puede deshacer y se desvinculará del sistema.'
  ): Promise<boolean> {
    const result = await CustomSwal.fire({
      title,
      text,
      icon: 'warning',
      iconColor: '#E11D48',
      showCancelButton: true,
      confirmButtonText: 'Sí, Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-3xl p-6 font-sans shadow-2xl border border-slate-100',
        title: 'text-lg font-black text-slate-900 tracking-tight',
        htmlContainer: 'text-xs text-slate-600 leading-relaxed mt-1',
        confirmButton:
          'px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition mx-1 cursor-pointer',
        cancelButton:
          'px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition mx-1 cursor-pointer',
      },
    });
    return result.isConfirmed;
  },

  // Confirmación general
  async confirmAction(
    title: string,
    text: string,
    confirmText = 'Continuar'
  ): Promise<boolean> {
    const result = await CustomSwal.fire({
      title,
      text,
      icon: 'question',
      iconColor: '#2563EB',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-3xl p-6 font-sans shadow-2xl border border-slate-100',
        title: 'text-lg font-black text-slate-900 tracking-tight',
        htmlContainer: 'text-xs text-slate-600 leading-relaxed mt-1',
        confirmButton:
          'px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition mx-1 cursor-pointer',
        cancelButton:
          'px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition mx-1 cursor-pointer',
      },
    });
    return result.isConfirmed;
  },

  // Notificación de éxito
  success(title: string, text?: string) {
    return CustomSwal.fire({
      icon: 'success',
      iconColor: '#10B981',
      title,
      text,
      timer: 2500,
      showConfirmButton: false,
    });
  },

  // Notificación de advertencia
  warning(title: string, text?: string) {
    return CustomSwal.fire({
      icon: 'warning',
      iconColor: '#F59E0B',
      title,
      text,
      confirmButtonText: 'Entendido',
      customClass: {
        popup: 'rounded-3xl p-6 font-sans shadow-2xl border border-slate-100',
        title: 'text-lg font-black text-slate-900 tracking-tight',
        htmlContainer: 'text-xs text-slate-600 leading-relaxed mt-1',
        confirmButton:
          'px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition cursor-pointer',
      },
    });
  },

  // Notificación de error
  error(title: string, text?: string) {
    return CustomSwal.fire({
      icon: 'error',
      iconColor: '#EF4444',
      title,
      text,
      confirmButtonText: 'Entendido',
      customClass: {
        popup: 'rounded-3xl p-6 font-sans shadow-2xl border border-slate-100',
        title: 'text-lg font-black text-slate-900 tracking-tight',
        htmlContainer: 'text-xs text-slate-600 leading-relaxed mt-1',
        confirmButton:
          'px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition cursor-pointer',
      },
    });
  },
};
