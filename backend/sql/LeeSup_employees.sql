-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Oct 15, 2026 at 03:44 AM
-- Server version: 8.0.46-0ubuntu0.24.04.4
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ip_std6730202459`
--

-- --------------------------------------------------------

--
-- Table structure for table `LeeSup_employees`
--

CREATE TABLE `LeeSup_employees` (
  `LeeSup_id` int NOT NULL,
  `LeeSup_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LeeSup_position` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LeeSup_status` enum('Active','On Leave') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `LeeSup_salary` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `LeeSup_employees`
--

INSERT INTO `LeeSup_employees` (`LeeSup_id`, `LeeSup_name`, `LeeSup_position`, `LeeSup_status`, `LeeSup_salary`) VALUES
(1, 'John Doe', 'Software Engineer', 'Active', 45000.00),
(2, 'Jane Smith', 'Project Manager', 'Active', 85000.00),
(3, 'Somchai Prasert', 'Junior Developer', 'Active', 18000.00),
(4, 'Emily Johnson', 'UX Designer', 'On Leave', 42000.00),
(5, 'Michael Brown', 'Engineering Director', 'Active', 95000.00),
(6, 'Napat Wong', 'Intern', 'Active', 15000.00),
(7, 'Sarah Davis', 'Data Analyst', 'Active', 48000.00),
(8, 'Kittipong Lee', 'Support Staff', 'On Leave', 20000.00),
(9, 'Olivia Martin', 'Senior Architect', 'Active', 90000.00),
(10, 'Daniel Garcia', 'QA Engineer', 'Active', 40000.00),
(11, 'Priya Patel', 'HR Specialist', 'Active', 17500.00),
(12, 'Liam Wilson', 'DevOps Engineer', 'Active', 80000.00);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `LeeSup_employees`
--
ALTER TABLE `LeeSup_employees`
  ADD PRIMARY KEY (`LeeSup_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `LeeSup_employees`
--
ALTER TABLE `LeeSup_employees`
  MODIFY `LeeSup_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
