export function Footer({ transparent = false }: { transparent?: boolean }) {
    return (
        <footer className={`w-full py-6 text-center text-neutral-500 text-sm mt-auto ${transparent ? '' : 'border-t border-neutral-800 bg-app backdrop-blur-sm'}`}>
            <p className="font-medium tracking-wide">
                Created by{' '}
                <a
                    href="https://github.com/minemap-nl/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 transition-colors underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:rounded"
                >
                    Minemap-nl
                </a>
            </p>
        </footer>
    );
}
