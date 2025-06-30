import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ cookies }) => {
        cookies.delete('auth_token', { path: '/' });
        // Add any other cleanup if needed
        throw redirect(303, '/login');
    }
};