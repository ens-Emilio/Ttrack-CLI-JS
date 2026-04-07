// Typing animation for the terminal
function typeEffect(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = "";
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            // Show output after typing
            const output = document.querySelector('.output-delayed');
            if (output) {
                setTimeout(() => {
                    output.style.opacity = "1";
                    output.style.transform = "translateY(0)";
                }, 500);
            }
        }
    }
    type();
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial terminal setup
    const typedElement = document.querySelector('.typed');
    const output = document.querySelector('.output-delayed');
    
    if (output) {
        output.style.opacity = "0";
        output.style.transform = "translateY(10px)";
        output.style.transition = "all 0.8s ease-out";
    }

    if (typedElement) {
        setTimeout(() => {
            typeEffect(typedElement, "ftt dashboard", 100);
        }, 1000);
    }

    // Copy to clipboard functionality
    const copyBar = document.getElementById('copy-install');
    if (copyBar) {
        const button = copyBar.querySelector('button');
        const code = copyBar.querySelector('code').innerText;

        button.addEventListener('click', () => {
            navigator.clipboard.writeText(code).then(() => {
                const originalText = button.innerText;
                button.innerText = "✅";
                setTimeout(() => {
                    button.innerText = originalText;
                }, 2000);
            });
        });
    }

    // Intersection Observer for fade-in animations
    const cards = document.querySelectorAll('.feature-card, .step');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        card.style.transition = "all 0.6s ease-out";
        observer.observe(card);
    });
});
