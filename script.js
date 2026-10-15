        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        primary: '#2563eb', // Blue 600
                        secondary: '#4f46e5', // Indigo 600
                        accent: '#0ea5e9', // Sky 500
                    }
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            // Set current year in footer
            document.getElementById('year').textContent = new Date().getFullYear();

            // Modal Elements
            const triggers = document.querySelectorAll('.resource-selector');
            const modal = document.getElementById('pyq-modal');
            const modalContent = document.getElementById('modal-content');
            const backdrop = document.getElementById('modal-backdrop');
            const closeBtn = document.getElementById('close-modal');
            
            // Selection Elements
            const branchBtns = document.querySelectorAll('.branch-btn');
            const yearBtns = document.querySelectorAll('.year-btn');
            const fetchBtn = document.getElementById('fetch-btn');
            
            // Toast Elements
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toast-message');

            // State
            let selectedBranch = null;
            let selectedYear = null;

            // Open Modal Logic
            const openModal = () => {
                modal.classList.remove('modal-hidden');
                modal.classList.add('modal-visible');
                // Tiny delay to ensure display:block applies before transform
                setTimeout(() => {
                    modalContent.classList.remove('scale-95');
                    modalContent.classList.add('scale-100');
                }, 10);
            };

            // Close Modal Logic
            const closeModal = () => {
                modalContent.classList.remove('scale-100');
                modalContent.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.remove('modal-visible');
                    modal.classList.add('modal-hidden');
                }, 300); // match transition duration
            };

            // Ask for branch and year only after one of the five resource cards is clicked.
            triggers.forEach(card => {
                card.addEventListener('click', (event) => {
                    // The cards contain placeholder links; stop them from jumping to the top.
                    if (event.target.closest('a')) event.preventDefault();
                    openModal();
                });
            });
            closeBtn.addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);

            // Handle Branch Selection
            branchBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Reset all
                    branchBtns.forEach(b => {
                        b.classList.remove('border-primary', 'bg-indigo-50', 'text-primary');
                        b.classList.add('border-slate-200', 'text-slate-600');
                    });
                    // Set active
                    const target = e.target;
                    target.classList.remove('border-slate-200', 'text-slate-600');
                    target.classList.add('border-primary', 'bg-indigo-50', 'text-primary');
                    
                    selectedBranch = target.getAttribute('data-value');
                });
            });

            // Handle Year Selection
            yearBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Reset all
                    yearBtns.forEach(b => {
                        b.classList.remove('border-primary', 'bg-indigo-50', 'text-primary');
                        b.classList.add('border-slate-200', 'text-slate-600');
                    });
                    // Set active
                    const target = e.target;
                    target.classList.remove('border-slate-200', 'text-slate-600');
                    target.classList.add('border-primary', 'bg-indigo-50', 'text-primary');
                    
                    selectedYear = target.getAttribute('data-value');
                });
            });

            // Show Custom Toast (No alerts allowed)
            const showToast = (message, isError = false) => {
                toastMessage.textContent = message;
                
                const iconContainer = toast.querySelector('div');
                const icon = toast.querySelector('i');
                const title = toast.querySelector('h4');
                
                if (isError) {
                    iconContainer.className = 'w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white';
                    icon.className = 'fa-solid fa-triangle-exclamation';
                    title.textContent = 'Action Required';
                } else {
                    iconContainer.className = 'w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white';
                    icon.className = 'fa-solid fa-check';
                    title.textContent = 'Success';
                }

                toast.classList.remove('translate-y-24', 'opacity-0');
                
                setTimeout(() => {
                    toast.classList.add('translate-y-24', 'opacity-0');
                }, 4000);
            };

            // Fetch Action
            fetchBtn.addEventListener('click', () => {
                if (!selectedBranch || !selectedYear) {
                    showToast('Please select both a branch and a year.', true);
                    
                    // Add shake animation to modal briefly to indicate error
                    modalContent.classList.add('animate-[shake_0.5s_ease-in-out]');
                    setTimeout(() => modalContent.classList.remove('animate-[shake_0.5s_ease-in-out]'), 500);
                    return;
                }

                showToast(`Loading papers for ${selectedBranch} - Year ${selectedYear}...`);
                closeModal();
                
                // Reset selections for next time
                setTimeout(() => {
                    selectedBranch = null;
                    selectedYear = null;
                    branchBtns.forEach(b => {
                        b.classList.remove('border-primary', 'bg-indigo-50', 'text-primary');
                        b.classList.add('border-slate-200', 'text-slate-600');
                    });
                    yearBtns.forEach(b => {
                        b.classList.remove('border-primary', 'bg-indigo-50', 'text-primary');
                        b.classList.add('border-slate-200', 'text-slate-600');
                    });
                }, 500);
            });


            // Mobile Menu Toggle Logic
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            const menuIcon = mobileMenuBtn.querySelector('i');

            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
                
                // Toggle between hamburger and close icon
                if (mobileMenu.classList.contains('hidden')) {
                    menuIcon.classList.remove('fa-xmark');
                    menuIcon.classList.add('fa-bars');
                } else {
                    menuIcon.classList.remove('fa-bars');
                    menuIcon.classList.add('fa-xmark');
                }
            });

            // Optional: Close mobile menu when clicking a link inside it
            const mobileLinks = mobileMenu.querySelectorAll('a');
            mobileLinks.forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                    menuIcon.classList.remove('fa-xmark');
                    menuIcon.classList.add('fa-bars');
                });
            });

            // Search Interaction (Simulated)
            const searchInput = document.getElementById('searchInput');
            const searchButton = searchInput.nextElementSibling;

            const handleSearch = () => {
                const query = searchInput.value.trim();
                if (query) {
                    // In a real app, this would trigger an API call or redirect
                    console.log(`Searching for: ${query}`);
                    
                    // Visual feedback setup (just for prototype)
                    const originalText = searchButton.innerText;
                    searchButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    
                    setTimeout(() => {
                        searchButton.innerText = originalText;
                        // Clear after simulation
                        searchInput.value = '';
                    }, 800);
                }
            };

            searchButton.addEventListener('click', handleSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });
        });
