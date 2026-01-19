import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CardsCarousel = ({ children }) => {
    const scrollContainerRef = useRef(null);
    const [showControls, setShowControls] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10); // tolerance
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        // Add scroll listener to update buttons state
        const el = scrollContainerRef.current;
        if (el) el.addEventListener('scroll', checkScroll);

        return () => {
            window.removeEventListener('resize', checkScroll);
            if (el) el.removeEventListener('scroll', checkScroll);
        };
    }, [children]);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const { clientWidth } = scrollContainerRef.current;
            const scrollAmount = clientWidth * 0.5; // Scroll half view
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="relative group -mx-4 px-4 md:mx-0 md:px-0">
            {/* 
                SCROLL CONTAINER (Smart Flexbox)
                - Always Flex layout (no Grid forcing)
                - overflow-x-auto: Enables scrolling when needed
                - min-w logic handled in children
            */}
            <div
                ref={scrollContainerRef}
                className="flex gap-5 overflow-x-auto pb-6 pt-1 snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {React.Children.map(children, (child) => (
                    <div className="
                        snap-center shrink-0 
                        /* Mobile & Tablet: Fixed sensible widths */
                        w-[85%] sm:w-[320px] 
                        
                        /* Desktop: Try to be 1/4th (fit 4 cols), BUT never shrink below 310px */
                        /* If container is narrow (sidebar open), min-w kicks in -> activates scroll */
                        xl:w-[calc(25%-15px)] xl:min-w-[310px]
                        
                        transition-all duration-300
                    ">
                        {child}
                    </div>
                ))}
            </div>

            {/* Left Button */}
            <button
                onClick={() => scroll('left')}
                className={`
                    absolute left-0 top-1/2 -translate-y-1/2 -ml-2 lg:-ml-5 
                    bg-white shadow-lg border border-gray-100 p-2 rounded-full text-gray-600 
                    hover:text-teal-600 hover:scale-110 active:scale-95 transition-all z-10
                    ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
            >
                <ChevronLeft size={24} />
            </button>

            {/* Right Button */}
            <button
                onClick={() => scroll('right')}
                className={`
                    absolute right-0 top-1/2 -translate-y-1/2 -mr-2 lg:-mr-5 
                    bg-white shadow-lg border border-gray-100 p-2 rounded-full text-gray-600 
                    hover:text-teal-600 hover:scale-110 active:scale-95 transition-all z-10
                    ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
            >
                <ChevronRight size={24} />
            </button>

            {/* Scroll Indicator Dots (Mobile Only Visual Aid) */}
            <div className="flex justify-center gap-1.5 absolute bottom-0 left-0 right-0 2xl:hidden h-1">
                {/* Only visual decoration, functionality handled by container scroll */}
            </div>
        </div>
    );
};

export default CardsCarousel;
