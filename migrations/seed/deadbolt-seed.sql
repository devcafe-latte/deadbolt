-- Adminer 4.7.1 MySQL dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

CREATE DATABASE `DEADBOLT_DB_NAME` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;
USE `DEADBOLT_DB_NAME`;

DROP TABLE IF EXISTS `authPassword`;
CREATE TABLE `authPassword` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `resetToken` varchar(36) DEFAULT NULL,
  `resetTokenExpires` int(11) DEFAULT NULL,
  `created` int(11) NOT NULL,
  `updated` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `authPassword_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `authPassword` (`id`, `userId`, `passwordHash`, `resetToken`, `resetTokenExpires`, `created`, `updated`) VALUES
(1,	1,	'plain:pineapples',	NULL,	NULL,	1565550000,	1565550000);

DROP TABLE IF EXISTS `emailTwoFactor`;
CREATE TABLE `emailTwoFactor` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `token` varchar(100) NOT NULL,
  `userToken` varchar(36) NOT NULL,
  `expires` int(11) NOT NULL,
  `used` tinyint(4) NOT NULL DEFAULT 0,
  `attempt` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `emailTwoFactor_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS `membership`;
CREATE TABLE `membership` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created` int(11) NOT NULL,
  `app` varchar(100) NOT NULL,
  `role` varchar(100) NOT NULL,
  `userId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `membership_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `membership` (`id`, `created`, `app`, `role`, `userId`) VALUES
(1,	1565516907,	'test-app',	'admin',	1);

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `run_on` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `migrations` (`id`, `name`, `run_on`) VALUES
(1,	'/20200517105949-totp',	'2020-05-23 11:49:46'),
(2,	'/20200520071812-2faFix',	'2020-05-23 11:49:46');

DROP TABLE IF EXISTS `session`;
CREATE TABLE `session` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(32) NOT NULL,
  `userId` int(11) NOT NULL,
  `created` int(11) NOT NULL,
  `expires` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `session_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `totpToken`;
CREATE TABLE `totpToken` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `totpTwoFactorId` int(11) NOT NULL,
  `attempt` int(11) NOT NULL,
  `userToken` varchar(36) NOT NULL,
  `expires` int(11) NOT NULL,
  `used` tinyint(4) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `totpTwoFactorId` (`totpTwoFactorId`),
  CONSTRAINT `totpToken_ibfk_1` FOREIGN KEY (`totpTwoFactorId`) REFERENCES `totpTwoFactor` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS `totpTwoFactor`;
CREATE TABLE `totpTwoFactor` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `secret` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `totpTwoFactor_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `firstName` varchar(100) DEFAULT NULL,
  `lastName` varchar(100) DEFAULT NULL,
  `active` tinyint(4) NOT NULL DEFAULT 1,
  `created` int(11) NOT NULL DEFAULT 0,
  `lastActivity` int(11) NOT NULL DEFAULT 0,
  `emailConfirmed` int(11) DEFAULT NULL,
  `emailConfirmToken` varchar(36) DEFAULT NULL,
  `emailConfirmTokenExpires` int(11) DEFAULT NULL,
  `twoFactor` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `user` (`id`, `uuid`, `username`, `email`, `firstName`, `lastName`, `active`, `created`, `lastActivity`, `emailConfirmed`, `emailConfirmToken`, `emailConfirmTokenExpires`, `twoFactor`) VALUES
(1,	'ee13624b-cf22-4597-adb9-bfa4b16baa71',	'admin',	NULL,	NULL,	NULL,	1,	0,	0,	1565550000,	NULL,	NULL,	NULL);

-- 2020-05-23 11:50:12
